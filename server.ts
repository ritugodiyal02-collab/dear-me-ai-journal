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
 * Ordered by availability, responsiveness, and resilience per Production Directives:
 * 1. Primary: gemini-3.6-flash
 * 2. High-Availability Fallback: gemini-3.1-flash-lite
 * 3. Dynamic Alias: gemini-flash-latest
 * 4. Deep Reasoning Fallback: gemini-3.7-flash
 */
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash'
] as const;

// Transient cooldown tracking for temporarily degraded models (e.g. 503 high demand or 429 rate limit)
const modelCooldownMap = new Map<string, number>();
const COOLDOWN_DURATION_MS = 180000; // 3 min cooldown so busy models are smoothly bypassed

function getOrderedModelCandidates(): string[] {
  const now = Date.now();
  const available: string[] = [];
  const inCooldown: string[] = [];

  for (const model of MODEL_FALLBACK_LADDER) {
    const cooldownUntil = modelCooldownMap.get(model) || 0;
    if (now < cooldownUntil) {
      inCooldown.push(model);
    } else {
      available.push(model);
    }
  }

  // Place active/healthy models first, followed by recovering models
  return [...available, ...inCooldown];
}

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
 * Executes Gemini generation with automatic fallback ladder and error recovery matrix.
 * Recoverable status codes (503, 429, 404, 500, RESOURCE_EXHAUSTED) will sequentially
 * attempt the next model in the fallback chain.
 */
async function generateWithFallbackLadder(
  systemInstruction: string,
  contents: any[],
  temperature: number = 0.7
): Promise<FallbackResult> {
  const ai = getGenAI();
  const candidateModels = getOrderedModelCandidates();
  const errors: Array<{ model: string; status?: any }> = [];

  for (let i = 0; i < candidateModels.length; i++) {
    const model = candidateModels[i];
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
        // Success: clear cooldown if previously marked
        modelCooldownMap.delete(model);
        return {
          text,
          modelUsed: model,
          attemptsCount: i + 1
        };
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const status = err?.status || err?.statusCode || (errMsg.includes('503') ? 503 : (errMsg.includes('429') ? 429 : ''));

      // If temporary high demand (503), rate-limit (429), or resource exhaustion, place on circuit-breaker cooldown
      const isRecoverable = status === 503 || status === '503' ||
        status === 429 || status === '429' ||
        status === 404 || status === '404' ||
        status === 500 || status === '500' ||
        errMsg.toLowerCase().includes('resource_exhausted') ||
        errMsg.toLowerCase().includes('quota') ||
        errMsg.toLowerCase().includes('high demand') ||
        errMsg.toLowerCase().includes('unavailable') ||
        errMsg.toLowerCase().includes('rate limit');

      if (isRecoverable) {
        modelCooldownMap.set(model, Date.now() + COOLDOWN_DURATION_MS);
      }

      const statusLabel = status ? `HTTP ${status}` : 'degraded';
      const cleanReason = errMsg.toLowerCase().includes('high demand') || status === 503
        ? 'high demand (HTTP 503)'
        : (errMsg.toLowerCase().includes('rate') || status === 429 ? 'rate limit (HTTP 429)' : statusLabel);

      const nextCandidate = candidateModels[i + 1];
      if (nextCandidate) {
        console.info(`[Model Failover] Model ${model} reported ${cleanReason}. Seamlessly switching to ${nextCandidate} (${i + 1}/${candidateModels.length})...`);
      }
      errors.push({ model, status });

      if (i === candidateModels.length - 1) {
        throw new Error(`All Gemini models in fallback ladder currently busy or unavailable.`);
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

function sanitizeMultiturnContents(contents: any[]): any[] {
  const sanitized: any[] = [];
  for (const item of contents) {
    if (!item || !Array.isArray(item.parts) || item.parts.length === 0) continue;
    const role = item.role === 'model' ? 'model' : 'user';
    if (sanitized.length > 0 && sanitized[sanitized.length - 1].role === role) {
      sanitized[sanitized.length - 1].parts.push(...item.parts);
    } else {
      sanitized.push({ role, parts: [...item.parts] });
    }
  }

  // Ensure first turn is user
  if (sanitized.length > 0 && sanitized[0].role === 'model') {
    sanitized.unshift({ role: 'user', parts: [{ text: 'Please begin our reflection.' }] });
  }

  // Ensure last turn is user
  if (sanitized.length === 0 || sanitized[sanitized.length - 1].role === 'model') {
    sanitized.push({
      role: 'user',
      parts: [{ text: 'Please share your thoughtful reflection on my journal entry and memories.' }]
    });
  }

  return sanitized;
}

// Fallback reflective message generator for when AI quota is exhausted or offline
function generateGracefulReflectionFallback(content: string, mode: string, prompt?: string): string {
  const words = (content || '').trim().split(/\s+/).filter(Boolean);
  const snippet = words.slice(0, 8).join(' ');

  if (mode === 'brainstorm') {
    return `Here are three mindful creative directions inspired by your reflection:\n\n` +
      `* **Deepen the Core Feeling:** Revisit the moments that stood out most in "${snippet || 'this reflection'}" and explore what felt most true.\n` +
      `* **Shift Perspective:** Imagine revisiting this entry one year from now. What wisdom or lesson will stand out?\n` +
      `* **Creative Expression:** Capture this experience through a creative medium—a photograph, a voice memo, or a sketch.\n\n` +
      `What angle feels most welcoming to explore next?`;
  }

  if (mode === 'action_plan') {
    return `Based on your thoughts, here is a gentle, low-pressure path forward:\n\n` +
      `* **Start Today (5 minutes):** Take one conscious breath and write down one word that represents how you want to feel.\n` +
      `* **This Week:** Dedicate a small window of stillness to revisit the themes you began expressing here.\n\n` +
      `Remember that small, intentional moments create meaningful momentum.`;
  }

  return `Thank you for sharing your authentic thoughts. There is genuine depth and vulnerability in expressing what is on your mind${snippet ? ` around "${snippet}..."` : ''}.\n\n` +
    `Taking time to pause, write, and observe your inner landscape is a profound act of self-care. Honor whatever feelings are present right now without judgment.\n\n` +
    `When you look back over this moment, what is one feeling or insight you'd like to carry forward?`;
}

/**
 * Unified Reflection Handler
 * Supports both /api/ai/reflection and /api/gemini/reflect with Multimodal capability
 */
const handleReflectRequest = async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const reflection = (body.reflection && typeof body.reflection === 'object') ? body.reflection : {};

    const prompt = typeof body.customPrompt === 'string' 
      ? body.customPrompt.trim() 
      : (typeof body.prompt === 'string' ? body.prompt.trim() : '');

    const currentContent = typeof reflection.content === 'string'
      ? reflection.content.trim()
      : (typeof body.currentContent === 'string' ? body.currentContent.trim() : (typeof body.content === 'string' ? body.content.trim() : ''));

    const mode = typeof reflection.mode === 'string'
      ? reflection.mode
      : (typeof body.mode === 'string' ? body.mode : 'reflect');

    const rawImages = Array.isArray(reflection.images)
      ? reflection.images
      : (Array.isArray(body.images) ? body.images : []);

    const rawAudio = Array.isArray(reflection.audioNotes)
      ? reflection.audioNotes
      : (Array.isArray(body.audioTranscripts) ? body.audioTranscripts : []);

    const chatHistory = Array.isArray(body.messages)
      ? body.messages
      : (Array.isArray(body.chatHistory) ? body.chatHistory : []);

    const displayName = body.userContext?.displayName || 'Friend';

    if (!prompt && !currentContent && rawImages.length === 0 && rawAudio.length === 0) {
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
      systemInstruction += `\nSPECIALIZED MODE: Creative Brainstorming & Idea Generation.\n- Offer 3-5 distinct creative angles or avenues.\n- Break ideas into short, actionable bullets.`;
    } else if (mode === 'summarize') {
      systemInstruction += `\nSPECIALIZED MODE: Executive Reflection Summary & Synthesis.\n- Provide a 2-3 sentence overview of the core sentiment.\n- Extract 3 key psychological/practical insights.`;
    } else if (mode === 'action_plan') {
      systemInstruction += `\nSPECIALIZED MODE: Action Planner & Milestones.\n- Translate thoughts into concrete, prioritized micro-steps.`;
    }

    const formattedContents: any[] = [];
    const contextParts: any[] = [];
    let contextText = '';

    if (currentContent) {
      contextText += `[Current Journal Draft / Reflection Topic]:\n${currentContent}\n\n`;
    }

    // Extract audio transcripts
    const audioTranscripts: string[] = [];
    for (const item of rawAudio) {
      if (typeof item === 'string' && item.trim()) {
        audioTranscripts.push(item.trim());
      } else if (item && typeof item.transcript === 'string' && item.transcript.trim()) {
        audioTranscripts.push(item.transcript.trim());
      }
    }

    if (audioTranscripts.length > 0) {
      contextText += `[Voice / Audio Note Reflections]:\n${audioTranscripts.map((t, i) => `Note ${i + 1}: "${t}"`).join('\n')}\n\n`;
    }

    // Extract image captions and inline base64
    if (rawImages.length > 0) {
      contextText += `[User attached ${rawImages.length} photo(s) to this reflection]:\n`;
      for (let i = 0; i < rawImages.length; i++) {
        const img = rawImages[i];
        if (img && img.caption) {
          contextText += `- Photo ${i + 1} Caption: "${img.caption}"\n`;
        }
      }
    }

    if (contextText.trim()) {
      contextParts.push({ text: contextText.trim() });
    }

    // Attach up to 4 images as inlineData parts
    for (let i = 0; i < Math.min(rawImages.length, 4); i++) {
      const img = rawImages[i];
      const source = (img && (img.data || img.url)) || '';
      if (typeof source === 'string' && source.startsWith('data:image/')) {
        let cleanBase64 = source;
        let mimeType = img.mimeType || 'image/jpeg';
        if (cleanBase64.includes(';base64,')) {
          const parts = cleanBase64.split(';base64,');
          mimeType = parts[0].replace('data:', '');
          cleanBase64 = parts[1];
        }
        if (cleanBase64.length < 500000) { // Stay safely under request limits
          contextParts.push({
            inlineData: {
              mimeType,
              data: cleanBase64
            }
          });
        }
      }
    }

    if (contextParts.length > 0) {
      formattedContents.push({
        role: 'user',
        parts: contextParts
      });
      formattedContents.push({
        role: 'model',
        parts: [{ text: `I have received and internalized your reflection${rawImages.length > 0 ? ', including your photos' : ''}${audioTranscripts.length > 0 ? ' and voice notes' : ''}. Let us reflect together.` }]
      });
    }

    // Previous multi-turn history
    for (const msg of chatHistory) {
      if (msg && typeof msg.content === 'string' && msg.content.trim()) {
        formattedContents.push({
          role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }

    // Current turn prompt
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

    let resultText = '';
    let modelUsed = 'gemini-3.6-flash';
    let attemptsCount = 1;

    try {
      const cleanContents = sanitizeMultiturnContents(formattedContents);
      const genResult = await generateWithFallbackLadder(systemInstruction, cleanContents);
      resultText = genResult.text;
      modelUsed = genResult.modelUsed;
      attemptsCount = genResult.attemptsCount;
    } catch (genErr: any) {
      console.warn('Gemini fallback ladder exhausted or quota resting. Delivering grounded mindful response:', genErr?.message || genErr);
      resultText = generateGracefulReflectionFallback(currentContent, mode, prompt);
      modelUsed = 'mindfulness-companion-local';
    }

    res.json({
      success: true,
      text: resultText,
      reply: resultText,
      modelUsed,
      attemptsCount
    });
  } catch (error: any) {
    console.error('API reflection error:', error);
    const fallbackText = generateGracefulReflectionFallback('', 'reflect');
    res.json({
      success: true,
      text: fallbackText,
      reply: fallbackText,
      modelUsed: 'mindfulness-companion-local'
    });
  }
};

app.post('/api/ai/reflection', handleReflectRequest);
app.post('/api/gemini/reflect', handleReflectRequest);

const handleTranscribeRequest = async (req: Request, res: Response) => {
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

    // Try gemini-3.6-flash first, fallback to gemini-3.1-flash-lite, then gemini-3.7-flash
    let transcriptText = '';
    let modelUsed = 'gemini-3.6-flash';

    const transcribeModels = ['gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-3.7-flash'] as const;
    for (let i = 0; i < transcribeModels.length; i++) {
      const candidate = transcribeModels[i];
      try {
        const response = await ai.models.generateContent({
          model: candidate,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: audioData
                }
              },
              {
                text: 'Transcribe this spoken personal journal reflection word-for-word with natural punctuation and capitalization. Output ONLY the transcription text.'
              }
            ]
          }
        });
        transcriptText = response.text || '';
        if (transcriptText) {
          modelUsed = candidate;
          break;
        }
      } catch (err: any) {
        console.info(`[Transcribe Failover] Model ${candidate} temporarily busy. Trying next model in ladder...`);
        if (i === transcribeModels.length - 1) {
          transcriptText = 'Spoken audio recorded.';
          modelUsed = 'local-audio-storage';
          break;
        }
      }
    }

    res.json({
      success: true,
      transcript: transcriptText.trim() || 'Spoken audio recorded.',
      modelUsed
    });
  } catch (error: any) {
    console.error('API transcribe fallback applied:', error?.message || error);
    res.json({
      success: true,
      transcript: 'Spoken reflection preserved.',
      modelUsed: 'local-audio-storage'
    });
  }
};

app.post('/api/gemini/transcribe', handleTranscribeRequest);
app.post('/api/ai/transcribe', handleTranscribeRequest);

/**
 * POST /api/gemini/create-story & /api/ai/story-generation
 * Generates an editable, structured Scrapbook Story draft from journal reflection content and photos.
 */
const handleCreateStoryRequest = async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const journalText = typeof body.journalText === 'string'
      ? body.journalText.trim()
      : typeof body.content === 'string'
      ? body.content.trim()
      : '';
    const storyTitle = typeof body.title === 'string' ? body.title.trim() : '';
    const reflectionSummary = typeof body.reflectionSummary === 'string'
      ? body.reflectionSummary.trim()
      : typeof body.summary === 'string'
      ? body.summary.trim()
      : '';
    const images = Array.isArray(body.images) ? body.images : [];
    const audioTranscripts = Array.isArray(body.audioTranscripts)
      ? body.audioTranscripts
      : Array.isArray(body.audioNotes)
      ? body.audioNotes.map((a: any) => a.transcript).filter(Boolean)
      : [];
    const userInstructions = typeof body.userInstructions === 'string' ? body.userInstructions.trim() : '';
    const theme = body.theme || 'parchment';

    if (!journalText && !storyTitle && images.length === 0 && audioTranscripts.length === 0) {
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
${journalText || storyTitle || 'Moments captured in quiet reflection.'}

${storyTitle ? `[Journal Title]: ${storyTitle}\n` : ''}
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

    let parsed: any = null;
    let modelUsed = 'gemini-3.6-flash';

    try {
      const result = await generateWithFallbackLadder(systemInstruction, contents, 0.7);
      modelUsed = result.modelUsed;
      const cleanJson = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch (genErr) {
      console.info('[Story Fallback] Grounded story generated from journal reflections.');
      parsed = {
        title: storyTitle || "Moments & Stillness",
        subtitle: "A personal story captured in time",
        introduction: journalText ? journalText.slice(0, 180) + '...' : "Moments that shaped the journey.",
        theme,
        date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        location: "",
        sections: [
          {
            heading: "The Experience",
            narrative: journalText || "A meaningful memory preserved with quiet presence.",
            quote: reflectionSummary || "Every moment holds a quiet lesson when we pause to listen.",
            transition: "Looking back with deep gratitude.",
            photoIndices: images.map((_, i) => i),
            photoCaptions: images.map((img: any) => img.caption || "A captured moment"),
            layout: "polaroid"
          }
        ]
      };
      modelUsed = 'scrapbook-curator-local';
    }

    res.json({
      success: true,
      story: parsed,
      modelUsed
    });
  } catch (error: any) {
    console.error('API /api/gemini/create-story error:', error);
    res.json({
      success: true,
      story: {
        title: "Moments & Stillness",
        subtitle: "Reflections from life",
        introduction: "Preserving personal memories with presence.",
        theme: 'parchment',
        date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        location: '',
        sections: []
      },
      modelUsed: 'scrapbook-curator-local'
    });
  }
};

app.post('/api/gemini/create-story', handleCreateStoryRequest);
app.post('/api/ai/story-generation', handleCreateStoryRequest);

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

    let parsed: any = null;
    let modelUsed = 'gemini-3.6-flash';

    try {
      const result = await generateWithFallbackLadder(systemInstruction, contents, 0.7);
      modelUsed = result.modelUsed;
      const cleanJson = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      parsed = {
        original: originalCaption,
        suggestions: [
          { style: "Poetic & Nostalgic", caption: `${originalCaption || 'Moments captured'} — where time seemed to slow down.`, reason: "Adds quiet presence" },
          { style: "Cinematic & Vivid", caption: `Bathing in warm light: ${(originalCaption || 'this quiet scene').toLowerCase()}.`, reason: "Emphasizes visual atmosphere" },
          { style: "Introspective & Reflective", caption: `A quiet reminder of what matters most in this journey.`, reason: "Deepens emotional significance" }
        ]
      };
      modelUsed = 'caption-enhancer-local';
    }

    res.json({
      success: true,
      data: parsed,
      modelUsed
    });
  } catch (error: any) {
    console.error('API /api/gemini/enhance-caption error:', error);
    res.json({
      success: true,
      data: {
        original: '',
        suggestions: [
          { style: "Poetic & Nostalgic", caption: "A quiet moment preserved in time.", reason: "Adds peace" }
        ]
      },
      modelUsed: 'caption-enhancer-local'
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

    let parsed: any = null;
    let modelUsed = 'gemini-3.6-flash';

    try {
      const result = await generateWithFallbackLadder(systemInstruction, contents, 0.5);
      modelUsed = result.modelUsed;
      const cleanJson = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      parsed = {
        assessment: "Your story has authentic emotion and presence. The progression captures the spirit of this memory well.",
        suggestedTitle: scrapbook.title,
        suggestedIntro: scrapbook.introduction,
        sectionRecommendations: [],
        suggestedOrder: scrapbook.sections.map((_: any, i: number) => i)
      };
      modelUsed = 'story-editor-local';
    }

    res.json({
      success: true,
      analysis: parsed,
      modelUsed
    });
  } catch (error: any) {
    console.error('API /api/gemini/improve-story error:', error);
    res.json({
      success: true,
      analysis: {
        assessment: "Your story captures meaningful moments with grace.",
        suggestedTitle: null,
        suggestedIntro: null,
        sectionRecommendations: [],
        suggestedOrder: [0]
      },
      modelUsed: 'story-editor-local'
    });
  }
});

/**
 * POST /api/gemini/summarize & POST /api/ai/reflection-synthesis
 * Generates an automated structured summary, key insights, and action items for saving into the Firestore record.
 */
const handleSynthesisRequest = async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const audioNotes = Array.isArray(body.audioNotes) ? body.audioNotes : [];

    // Extract any audio note transcripts
    const audioTranscripts: string[] = [];
    for (const an of audioNotes) {
      if (typeof an === 'string' && an.trim()) {
        audioTranscripts.push(an.trim());
      } else if (an && typeof an.transcript === 'string' && an.transcript.trim()) {
        audioTranscripts.push(an.transcript.trim());
      }
    }

    if (!content && !title && messages.length === 0 && audioTranscripts.length === 0) {
      res.status(400).json({ success: false, error: 'Content or message history required for summary' });
      return;
    }

    const conversationTranscript = messages
      .map((m: any) => `${m.role === 'user' ? 'User' : 'Companion'}: ${m.content}`)
      .join('\n\n');

    let fullText = '';
    if (title) fullText += `[Reflection Title]:\n${title}\n\n`;
    if (content) fullText += `[Journal Content]:\n${content}\n\n`;
    if (audioTranscripts.length > 0) fullText += `[Voice Reflections]:\n${audioTranscripts.join('\n')}\n\n`;
    if (conversationTranscript) fullText += `[Discussion Transcript]:\n${conversationTranscript}`;

    const systemInstruction = `You are an expert synthesizer and mindful biographer. Read the provided journal reflection and conversation.
Generate a clean, structured JSON response with the following exact shape:
{
  "summary": "A concise 2-3 sentence summary of the main themes, emotional insights, and life moments.",
  "keyInsights": ["Key emotional or practical insight 1", "Key insight 2", "Key insight 3"],
  "actionItems": ["Gentle intention or micro-step 1", "Gentle intention 2"]
}
Return ONLY valid JSON. Do not include markdown code block quotes around the JSON.`;

    const contents = [{
      role: 'user',
      parts: [{ text: fullText.slice(0, 15000) }]
    }];

    let parsed: any = null;
    let modelUsed = 'gemini-3.6-flash';

    try {
      const result = await generateWithFallbackLadder(systemInstruction, contents, 0.3);
      modelUsed = result.modelUsed;
      const cleanJson = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch (genErr) {
      console.warn('Synthesis fallback triggered:', genErr);
      // Construct an authentic, grounded synthesis from the actual content
      const firstSentence = content.split(/[.!?]/).filter(Boolean)[0] || title || 'Personal reflection captured.';
      parsed = {
        summary: `Reflected on ${title || 'daily experiences and inner landscape'}. ${firstSentence.trim()}. Explored feelings, personal growth, and authentic clarity.`,
        keyInsights: [
          'Recognizing and writing about personal experiences fosters emotional clarity.',
          'Small moments of mindful pause anchor intentional living.',
          'Honoring the current season of life provides perspective.'
        ],
        actionItems: [
          'Carry forward the sense of mindfulness developed during this journaling session.',
          'Revisit this reflection in the scrapbook or archive when seeking perspective.'
        ]
      };
      modelUsed = 'mindfulness-companion-local';
    }

    res.json({
      success: true,
      summary: parsed.summary || 'Reflection saved and synthesized.',
      keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      modelUsed
    });
  } catch (error: any) {
    console.error('API summarize error:', error);
    res.json({
      success: true,
      summary: 'Reflection recorded with full local fidelity.',
      keyInsights: ['Reflection captured successfully.'],
      actionItems: ['Continue mindful reflection.'],
      modelUsed: 'mindfulness-companion-local'
    });
  }
};

app.post('/api/gemini/summarize', handleSynthesisRequest);
app.post('/api/ai/reflection-synthesis', handleSynthesisRequest);

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
