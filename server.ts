import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Top-Level Request Deserialization with high capacity for base64 images & audio
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/**
 * Resilient Gemini Model Fallback Ladder
 * Ordered by availability, responsiveness, and resilience
 */
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash'
] as const;

let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured. Please set it in AI Studio Secrets or .env file.');
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return genAIClient;
}

interface FallbackResult {
  text: string;
  modelUsed: string;
  attemptsCount: number;
}

/**
 * Executes Gemini generation with automatic fallback ladder and error recovery matrix
 */
async function generateWithFallbackLadder(
  systemInstruction: string,
  contents: any[],
  temperature: number = 0.7
): Promise<FallbackResult> {
  const ai = getGenAI();
  const errors: Array<{ model: string; error: string }> = [];

  for (let i = 0; i < MODEL_FALLBACK_LADDER.length; i++) {
    const model = MODEL_FALLBACK_LADDER[i];
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature,
        }
      });

      const text = response.text || '';
      if (text) {
        return {
          text,
          modelUsed: model,
          attemptsCount: i + 1
        };
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const status = err?.status || err?.statusCode || '';
      console.warn(`[Gemini Fallback] Model ${model} failed (Status: ${status}): ${errMsg}. Attempting next model...`);
      errors.push({ model, error: errMsg });

      if (i === MODEL_FALLBACK_LADDER.length - 1) {
        throw new Error(`All Gemini models in fallback ladder failed. Details: ${JSON.stringify(errors)}`);
      }
    }
  }

  throw new Error('Gemini API call failed across all available models in the ladder.');
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: Date.now(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

/**
 * POST /api/gemini/reflect
 * Multi-turn reflective conversation with full Multimodal support:
 * - Text entry
 * - Attached images (sent as inlineData to Gemini)
 * - Audio notes & transcriptions
 * - Conversation history
 */
app.post('/api/gemini/reflect', async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const currentContent = typeof body.currentContent === 'string' ? body.currentContent.trim() : '';
    const mode = body.mode || 'reflect';
    const chatHistory = Array.isArray(body.chatHistory) ? body.chatHistory : [];
    const images = Array.isArray(body.images) ? body.images : [];
    const audioTranscripts = Array.isArray(body.audioTranscripts) ? body.audioTranscripts : [];
    const displayName = body.userContext?.displayName || 'Friend';

    if (!prompt && !currentContent && images.length === 0 && audioTranscripts.length === 0) {
      res.status(400).json({ success: false, error: 'Journal content, images, voice notes, or prompt is required.' });
      return;
    }

    let systemInstruction = `You are Aetheria, an empathetic, perceptive, and supportive AI journaling companion for ${displayName}.
Your mission is to help the user unpack their experiences, gain clarity, identify emotional themes, brainstorm possibilities, and reflect with compassion and depth.

MULTIMODAL CONTEXT INTEGRATION:
- The user may share reflections combining written text, captured photos, and recorded voice notes.
- When photos are attached, observe their details, mood, atmosphere, and aesthetic subtleties. Seamlessly reference what you see in the images to ground your reflection in real life.
- When voice transcripts or audio thoughts are included, honor their spoken tone, candid thoughts, and vocal emotional nuance.
- Always acknowledge the holistic experience (text + visuals + voice).

IMPORTANT FORMATTING & READABILITY GUIDELINES:
- Structure your response into 2 to 3 short, breathable paragraphs. Never write large, dense single blocks of text.
- Use bold highlights sparingly on poignant phrases or emotional shifts.
- If sharing points, use clean bullet lists with a blank line before and after.
- If quoting a meaningful thought from the user's reflection, place it in a markdown blockquote (> quote).
- End with a gentle, open-ended question or grounding thought that invites peaceful exploration.`;

    if (mode === 'brainstorm') {
      systemInstruction += `
SPECIALIZED MODE: Creative Brainstorming & Idea Generation.
- Offer 3-5 distinct creative angles or avenues.
- Connect ideas directly to any photos or spoken thoughts shared.
- Break ideas into short, actionable bullets.
- Conclude with a clarifying question to narrow down their preferred direction.`;
    } else if (mode === 'summarize') {
      systemInstruction += `
SPECIALIZED MODE: Executive Reflection Summary & Synthesis.
- Provide a 2-3 sentence overview of the core sentiment and central topic.
- Extract 3 key psychological/practical insights.
- Provide 2 gentle, realistic next steps or reflection prompts.`;
    } else if (mode === 'action_plan') {
      systemInstruction += `
SPECIALIZED MODE: Action Planner & Milestones.
- Translate thoughts and reflections into concrete, prioritized micro-steps.
- Provide low-friction 'Start Today' steps, followed by 'This Week' goals.`;
    }

    const formattedContents: any[] = [];

    // 1. Initial Context Part with Journal Text, Attached Images, and Voice Transcripts
    const contextParts: any[] = [];
    let contextText = '';

    if (currentContent) {
      contextText += `[Current Journal Draft / Reflection Topic]:\n${currentContent}\n\n`;
    }

    if (audioTranscripts.length > 0) {
      contextText += `[Voice / Audio Note Reflections]:\n${audioTranscripts.map((t: string, i: number) => `Note ${i + 1}: "${t}"`).join('\n')}\n\n`;
    }

    if (images.length > 0) {
      contextText += `[User attached ${images.length} photo(s) to this reflection]:\n`;
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img.caption) {
          contextText += `- Photo ${i + 1} Caption: "${img.caption}"\n`;
        }
      }
    }

    if (contextText.trim()) {
      contextParts.push({ text: contextText.trim() });
    }

    // Attach up to 5 images as inlineData parts
    for (let i = 0; i < Math.min(images.length, 5); i++) {
      const img = images[i];
      if (img.data) {
        let cleanBase64 = img.data;
        let mimeType = img.mimeType || 'image/jpeg';
        if (cleanBase64.includes(';base64,')) {
          const parts = cleanBase64.split(';base64,');
          mimeType = parts[0].replace('data:', '');
          cleanBase64 = parts[1];
        }
        contextParts.push({
          inlineData: {
            mimeType,
            data: cleanBase64
          }
        });
      }
    }

    if (contextParts.length > 0) {
      formattedContents.push({
        role: 'user',
        parts: contextParts
      });
      formattedContents.push({
        role: 'model',
        parts: [{ text: `I have received and internalized your reflection${images.length > 0 ? ', including your photos' : ''}${audioTranscripts.length > 0 ? ' and voice notes' : ''}. Let us reflect together.` }]
      });
    }

    // 2. Previous multi-turn history
    for (const msg of chatHistory) {
      if (msg && typeof msg.content === 'string') {
        formattedContents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }

    // 3. Current turn prompt
    if (prompt) {
      formattedContents.push({
        role: 'user',
        parts: [{ text: prompt }]
      });
    } else if (contextParts.length > 0 && formattedContents.length === 2) {
      formattedContents.push({
        role: 'user',
        parts: [{ text: `Please provide a thoughtful, empathetic reflection on my journal entry and attached media above.` }]
      });
    }

    const result = await generateWithFallbackLadder(systemInstruction, formattedContents);

    res.json({
      success: true,
      reply: result.text,
      modelUsed: result.modelUsed,
      attemptsCount: result.attemptsCount
    });
  } catch (error: any) {
    console.error('API /api/gemini/reflect error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to generate reflection response'
    });
  }
});

/**
 * POST /api/gemini/transcribe
 * Transcribes recorded audio into clean, faithful text
 */
app.post('/api/gemini/transcribe', async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    let audioData = typeof body.audioData === 'string' ? body.audioData : '';
    let mimeType = typeof body.mimeType === 'string' ? body.mimeType : 'audio/webm';

    if (!audioData) {
      res.status(400).json({ success: false, error: 'audioData base64 string is required.' });
      return;
    }

    if (audioData.includes(';base64,')) {
      const parts = audioData.split(';base64,');
      mimeType = parts[0].replace('data:', '');
      audioData = parts[1];
    }

    const ai = getGenAI();

    // Try gemini-3.5-transcribe first, fallback to gemini-3.7-flash
    let transcriptText = '';
    let modelUsed = 'gemini-3.5-transcribe';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioData
              }
            },
            {
              text: 'Transcribe this spoken personal journal reflection word-for-word with natural punctuation and capitalization.'
            }
          ]
        }
      });
      transcriptText = response.text || '';
    } catch (e: any) {
      console.warn('gemini-3.5-transcribe error, falling back to gemini-3.7-flash:', e?.message);
      modelUsed = 'gemini-3.7-flash';
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioData
              }
            },
            {
              text: 'Transcribe this spoken audio reflection faithfully into written text. Output ONLY the transcription.'
            }
          ]
        }
      });
      transcriptText = fallbackResponse.text || '';
    }

    res.json({
      success: true,
      transcript: transcriptText.trim(),
      modelUsed
    });
  } catch (error: any) {
    console.error('API /api/gemini/transcribe error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to transcribe audio'
    });
  }
});

/**
 * POST /api/gemini/create-story
 * Generates an editable, structured Scrapbook Story draft from journal reflection content and photos.
 */
app.post('/api/gemini/create-story', async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const journalText = typeof body.journalText === 'string' ? body.journalText.trim() : '';
    const reflectionSummary = typeof body.reflectionSummary === 'string' ? body.reflectionSummary : '';
    const images = Array.isArray(body.images) ? body.images : [];
    const audioTranscripts = Array.isArray(body.audioTranscripts) ? body.audioTranscripts : [];
    const userInstructions = typeof body.userInstructions === 'string' ? body.userInstructions.trim() : '';
    const theme = body.theme || 'parchment';

    if (!journalText && images.length === 0 && audioTranscripts.length === 0) {
      res.status(400).json({ success: false, error: 'Journal reflection or images required to generate a story.' });
      return;
    }

    let photosContext = '';
    if (images.length > 0) {
      photosContext = images.map((img: any, idx: number) => {
        return `Photo ${idx + 1}: ${img.caption ? `"${img.caption}"` : `Image file ${img.name || 'moment'}`}`;
      }).join('\n');
    }

    const promptContext = `
[User's Journal Content]:
${journalText}

${reflectionSummary ? `[Gemini Synthesis / Key Takeaways]:\n${reflectionSummary}\n` : ''}
${audioTranscripts.length > 0 ? `[Spoken Reflections]:\n${audioTranscripts.join('\n')}\n` : ''}
${photosContext ? `[Attached Photos (${images.length})]:\n${photosContext}\n` : ''}
${userInstructions ? `[User Specific Request / Direction]:\n${userInstructions}\n` : ''}
`;

    const systemInstruction = `You are a master memory curator, biographer, and scrapbook author.
Transform the user's personal reflection, photos, and spoken memories into an evocative, beautiful, and structured Scrapbook Story draft.

YOUR GOAL:
1. Craft an evocative, memorable Title (e.g. "A Weekend That Felt Like a Reset", "Under the Golden Hour in Goa", "Small Moments of Stillness").
2. Write a captivating Subtitle and an emotional 1-2 sentence Introduction (e.g. "Sometimes you don't realize how much you needed a break until you're finally away.").
3. Organize the memories into 2 to 4 cohesive Story Sections.
   Each section MUST have:
   - "heading": A creative section title (e.g. "The Morning Mist", "Where the Light Shifts", "Finding Quiet")
   - "narrative": A warm, richly phrased paragraph (2-4 sentences) telling the story of this chapter.
   - "quote": A poignant excerpt or quote capturing the emotional truth.
   - "transition": A short bridge sentence leading into the next moment.
   - "photoIndices": Array of zero-based indices corresponding to the photos relevant for this section (from 0 to ${Math.max(0, images.length - 1)}).
   - "photoCaptions": Array of vivid, evocative captions matching each photo in this section.
   - "layout": One of 'polaroid', 'grid', 'single', 'story-split', or 'quote-focus'.

Output ONLY valid JSON with this exact schema:
{
  "title": "Story Title",
  "subtitle": "Poetic Subtitle",
  "introduction": "Introductory reflection...",
  "theme": "${theme}",
  "date": "${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}",
  "location": "",
  "sections": [
    {
      "heading": "Section Heading",
      "narrative": "Narrative paragraph...",
      "quote": "Memorable quote...",
      "transition": "Transition phrase...",
      "photoIndices": [0],
      "photoCaptions": ["Rich photo caption..."],
      "layout": "polaroid"
    }
  ]
}
Do NOT include markdown backticks around the JSON.`;

    const contents = [{
      role: 'user',
      parts: [{ text: promptContext }]
    }];

    const result = await generateWithFallbackLadder(systemInstruction, contents, 0.7);

    let parsed: any = {};
    try {
      const cleanJson = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      parsed = {
        title: "Memories & Reflections",
        subtitle: "A personal story captured in time",
        introduction: journalText.slice(0, 180) || "Moments that shaped the journey.",
        theme,
        sections: [
          {
            heading: "The Experience",
            narrative: journalText || "A meaningful memory preserved.",
            quote: "Every moment holds a quiet lesson.",
            transition: "Looking ahead with clarity.",
            photoIndices: images.map((_, i) => i),
            photoCaptions: images.map((img: any) => img.caption || "A captured moment"),
            layout: "polaroid"
          }
        ]
      };
    }

    res.json({
      success: true,
      story: parsed,
      modelUsed: result.modelUsed
    });
  } catch (error: any) {
    console.error('API /api/gemini/create-story error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to create scrapbook story'
    });
  }
});

/**
 * POST /api/gemini/enhance-caption
 * Suggests richer, emotive, and vivid captions for photos while preserving user's voice and intent.
 */
app.post('/api/gemini/enhance-caption', async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const originalCaption = typeof body.originalCaption === 'string' ? body.originalCaption.trim() : '';
    const journalContext = typeof body.journalContext === 'string' ? body.journalContext.trim() : '';
    const imageDescription = typeof body.imageDescription === 'string' ? body.imageDescription.trim() : '';

    if (!originalCaption && !journalContext && !imageDescription) {
      res.status(400).json({ success: false, error: 'Original caption or context is required.' });
      return;
    }

    const systemInstruction = `You are a poetic writer and memory archivist.
The user wants to enhance a photo caption in their personal scrapbook.

User's draft caption: "${originalCaption || 'Captured moment'}"
${journalContext ? `Journal Context: "${journalContext}"` : ''}
${imageDescription ? `Image details: "${imageDescription}"` : ''}

Provide 3 distinct, beautiful caption variations:
1. "poetic": Lyrical, atmospheric, evoking feelings of nostalgia and peace.
2. "cinematic": Vivid imagery, focusing on light, environment, and sense of place.
3. "reflective": Warm, introspective, connecting the moment to personal meaning.

Output ONLY valid JSON with this shape:
{
  "original": "${originalCaption}",
  "suggestions": [
    { "style": "Poetic & Nostalgic", "caption": "...", "reason": "..." },
    { "style": "Cinematic & Vivid", "caption": "...", "reason": "..." },
    { "style": "Introspective & Reflective", "caption": "...", "reason": "..." }
  ]
}`;

    const contents = [{
      role: 'user',
      parts: [{ text: `Please enhance this caption: "${originalCaption}"` }]
    }];

    const result = await generateWithFallbackLadder(systemInstruction, contents, 0.7);

    let parsed: any = {};
    try {
      const cleanJson = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      parsed = {
        original: originalCaption,
        suggestions: [
          { style: "Poetic & Nostalgic", caption: `${originalCaption} — where time seemed to slow down.`, reason: "Adds quiet presence" },
          { style: "Cinematic & Vivid", caption: `Bathing in warm light: ${originalCaption.toLowerCase()}.`, reason: "Emphasizes visual atmosphere" },
          { style: "Introspective & Reflective", caption: `A quiet reminder of what matters most.`, reason: "Deepens emotional significance" }
        ]
      };
    }

    res.json({
      success: true,
      data: parsed,
      modelUsed: result.modelUsed
    });
  } catch (error: any) {
    console.error('API /api/gemini/enhance-caption error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to enhance caption'
    });
  }
});

/**
 * POST /api/gemini/improve-story
 * Analyzes an existing Scrapbook and suggests narrative flow, transitions, and section rearrangements.
 */
app.post('/api/gemini/improve-story', async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const scrapbook = body.scrapbook;
    const userGoal = typeof body.userGoal === 'string' ? body.userGoal.trim() : '';

    if (!scrapbook || !Array.isArray(scrapbook.sections)) {
      res.status(400).json({ success: false, error: 'Valid scrapbook object with sections is required.' });
      return;
    }

    const systemInstruction = `You are a creative editor for memory albums and personal scrapbooks.
Analyze the user's scrapbook structure, narrative pacing, and transitions.

Scrapbook Title: "${scrapbook.title || 'Untitled'}"
Introduction: "${scrapbook.introduction || ''}"
Sections Count: ${scrapbook.sections.length}
Sections Summary:
${scrapbook.sections.map((s: any, idx: number) => `Section ${idx + 1}: Heading="${s.heading || 'Untitled'}", Narrative="${(s.narrative || '').slice(0, 100)}...", Photos=${s.photos?.length || 0}`).join('\n')}

${userGoal ? `User Goal: "${userGoal}"` : ''}

Provide intelligent, non-destructive recommendations:
1. Overall narrative arc assessment (strengths and opportunities).
2. Suggested sequence of sections (if a different emotional tempo works better).
3. Smoother transition sentences between chapters.
4. Suggested title & section heading refinements.

Output ONLY valid JSON:
{
  "assessment": "2-3 sentences evaluating the current story flow...",
  "suggestedTitle": "Refined Title or null if current is great",
  "suggestedIntro": "Polished intro...",
  "sectionRecommendations": [
    {
      "sectionIndex": 0,
      "suggestedHeading": "...",
      "suggestedTransition": "...",
      "narrativeTip": "..."
    }
  ],
  "suggestedOrder": [0, 1, 2]
}`;

    const contents = [{
      role: 'user',
      parts: [{ text: `Analyze and improve the story flow of this scrapbook.` }]
    }];

    const result = await generateWithFallbackLadder(systemInstruction, contents, 0.5);

    let parsed: any = {};
    try {
      const cleanJson = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      parsed = {
        assessment: "Your story has authentic emotion. Tightening the transitions will give it a seamless storybook cadence.",
        suggestedTitle: scrapbook.title,
        suggestedIntro: scrapbook.introduction,
        sectionRecommendations: [],
        suggestedOrder: scrapbook.sections.map((_: any, i: number) => i)
      };
    }

    res.json({
      success: true,
      analysis: parsed,
      modelUsed: result.modelUsed
    });
  } catch (error: any) {
    console.error('API /api/gemini/improve-story error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to analyze story'
    });
  }
});

/**
 * POST /api/gemini/summarize
 * Generates an automated structured summary, key insights, and action items for saving into the Firestore record.
 */
app.post('/api/gemini/summarize', async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (!content && messages.length === 0) {
      res.status(400).json({ success: false, error: 'Content or message history required for summary' });
      return;
    }

    const conversationTranscript = messages
      .map((m: any) => `${m.role === 'user' ? 'User' : 'Gemini'}: ${m.content}`)
      .join('\n\n');

    const fullText = `[Journal Content]:\n${content}\n\n[Discussion Transcript]:\n${conversationTranscript}`;

    const systemInstruction = `You are an expert synthesizer. Read the provided journal reflection and conversation.
Generate a clean, structured JSON response with the following exact shape:
{
  "summary": "A concise 2-3 sentence summary of the main themes and emotions.",
  "keyInsights": ["Insight 1", "Insight 2", "Insight 3"],
  "actionItems": ["Action item 1", "Action item 2"]
}
Return ONLY valid JSON. Do not include markdown code block quotes around the JSON.`;

    const contents = [{
      role: 'user',
      parts: [{ text: fullText }]
    }];

    const result = await generateWithFallbackLadder(systemInstruction, contents, 0.3);
    
    let parsed: any = {};
    try {
      const cleanJson = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      parsed = {
        summary: result.text.slice(0, 250),
        keyInsights: ['Reflection captured and processed successfully.'],
        actionItems: ['Continue periodic self-reflection.']
      };
    }

    res.json({
      success: true,
      summary: parsed.summary || 'Summary compiled.',
      keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      modelUsed: result.modelUsed
    });
  } catch (error: any) {
    console.error('API /api/gemini/summarize error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to synthesize summary'
    });
  }
});

// Vite middleware & Production Serving Setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✨ Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
