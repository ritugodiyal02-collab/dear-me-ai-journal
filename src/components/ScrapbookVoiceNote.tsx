import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Volume2, VolumeX, Upload, Plus } from 'lucide-react';
import { WashiTapeStrip } from './ScrapbookDecorations';
import { ScrapbookAudioNoteItem } from '../types';

export const MAX_VOICE_NOTES_PER_PAGE = 2;

interface ScrapbookVoiceNoteProps {
  audioNotes?: ScrapbookAudioNoteItem[];
  audioData?: {
    transcript?: string;
    duration?: number;
    url?: string;
    label?: string;
    memoStickyNote?: string;
  };
  narrativeText?: string;
  chapterTitle?: string;
  isEditMode?: boolean;
  onUpdateAudioNotes?: (notes: ScrapbookAudioNoteItem[]) => void;
  onUpdateAudio?: (audioData: ScrapbookAudioNoteItem | undefined) => void;
}

export function ScrapbookVoiceNote({
  audioNotes,
  audioData,
  narrativeText = '',
  chapterTitle = 'Chapter',
  isEditMode = false,
  onUpdateAudioNotes,
  onUpdateAudio
}: ScrapbookVoiceNoteProps) {
  // Normalize notes list
  const notes: ScrapbookAudioNoteItem[] = React.useMemo(() => {
    if (audioNotes && audioNotes.length > 0) {
      return audioNotes.filter((n) => Boolean(n.url));
    }
    if (audioData?.url) {
      return [
        {
          id: 'audio_default',
          url: audioData.url,
          duration: audioData.duration || 30,
          label: audioData.label || 'Voice Memo ♡',
          transcript: audioData.transcript,
          memoStickyNote: audioData.memoStickyNote
        }
      ];
    }
    return [];
  }, [audioNotes, audioData]);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [replacingNoteId, setReplacingNoteId] = useState<string | null>(null);

  // Playback state
  const [playingNoteId, setPlayingNoteId] = useState<string | null>(null);
  const [isStorytellerPlaying, setIsStorytellerPlaying] = useState(false);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const fileAudioInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to commit notes updates
  const commitNotes = (nextNotes: ScrapbookAudioNoteItem[]) => {
    if (onUpdateAudioNotes) {
      onUpdateAudioNotes(nextNotes);
    }
    if (onUpdateAudio) {
      onUpdateAudio(nextNotes[0] || undefined);
    }
  };

  // Stop all active playback
  const stopPlayback = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingNoteId(null);
    setIsStorytellerPlaying(false);
    setCurrentPlaybackTime(0);
  };

  // Clean up on unmount or chapter change
  useEffect(() => {
    return () => {
      stopPlayback();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [chapterTitle]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Play / pause a specific recorded audio note
  const handleTogglePlayNote = (note: ScrapbookAudioNoteItem) => {
    if (!note.url) return;

    if (playingNoteId === note.id) {
      // Pause
      stopPlayback();
      return;
    }

    // Start playing this note
    stopPlayback();

    const audio = new Audio(note.url);
    audioElementRef.current = audio;

    audio.ontimeupdate = () => {
      setCurrentPlaybackTime(Math.floor(audio.currentTime));
    };

    audio.onended = () => {
      stopPlayback();
    };

    audio.onerror = (e) => {
      console.warn('Audio playback error:', e);
      stopPlayback();
    };

    audio.play().then(() => {
      setPlayingNoteId(note.id);
    }).catch((err) => {
      console.warn('Playback play() failed:', err);
      stopPlayback();
    });
  };

  // Toggle AI Storyteller (Web Speech API)
  const handleToggleStoryteller = () => {
    if (isStorytellerPlaying) {
      stopPlayback();
      return;
    }

    if (!('speechSynthesis' in window)) {
      setRecordError('Speech synthesis not supported on this device.');
      return;
    }

    stopPlayback();

    const textToRead = narrativeText || `Reflections and peaceful moments from ${chapterTitle}.`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = speechSpeed;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const warmVoice = voices.find((v) => 
      v.lang.startsWith('en') && 
      (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Google') || v.name.includes('Serena'))
    );
    if (warmVoice) {
      utterance.voice = warmVoice;
    }

    utterance.onend = () => {
      setIsStorytellerPlaying(false);
    };

    utterance.onerror = () => {
      setIsStorytellerPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsStorytellerPlaying(true);
  };

  // Start microphone recording
  const startRecording = async (targetNoteId?: string) => {
    if (!targetNoteId && notes.length >= MAX_VOICE_NOTES_PER_PAGE) {
      setRecordError(`Page limit reached (max ${MAX_VOICE_NOTES_PER_PAGE} voice notes per chapter spread).`);
      return;
    }

    setRecordError(null);
    setReplacingNoteId(targetNoteId || null);
    stopPlayback();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setRecordError('Microphone not supported on this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach((t) => t.stop());

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const noteIndex = replacingNoteId ? notes.findIndex((n) => n.id === replacingNoteId) : -1;

          if (noteIndex >= 0) {
            // Update existing note
            const updated = [...notes];
            updated[noteIndex] = {
              ...updated[noteIndex],
              url: base64,
              duration: recordingSeconds || 1,
              label: updated[noteIndex].label || `Voice Memo ${noteIndex + 1} ♡`
            };
            commitNotes(updated);
          } else {
            // Add new note
            const newNote: ScrapbookAudioNoteItem = {
              id: `audio_${Date.now()}`,
              url: base64,
              duration: recordingSeconds || 1,
              label: `Voice Memo ${notes.length + 1} ♡`,
              transcript: `Spoken reflection for ${chapterTitle}`
            };
            commitNotes([...notes, newNote].slice(0, MAX_VOICE_NOTES_PER_PAGE));
          }

          setIsRecording(false);
          setRecordingSeconds(0);
          setReplacingNoteId(null);
        };
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Record error:', err);
      setRecordError('Please allow microphone permissions to record your voice memo.');
      setIsRecording(false);
      setReplacingNoteId(null);
    }
  };

  // Stop active recording
  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Handle manual audio file upload
  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (notes.length >= MAX_VOICE_NOTES_PER_PAGE) {
      setRecordError(`Page limit reached (max ${MAX_VOICE_NOTES_PER_PAGE} voice notes per chapter spread).`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const newNote: ScrapbookAudioNoteItem = {
        id: `audio_${Date.now()}`,
        url: base64,
        duration: 45,
        label: file.name.replace(/\.[^/.]+$/, '').slice(0, 24) || `Audio Note ${notes.length + 1} ♡`,
        transcript: `Preserved audio for ${chapterTitle}`
      };
      commitNotes([...notes, newNote].slice(0, MAX_VOICE_NOTES_PER_PAGE));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Delete a voice note
  const handleDeleteNote = (noteId: string) => {
    stopPlayback();
    const filtered = notes.filter((n) => n.id !== noteId);
    commitNotes(filtered);
  };

  // If in View Mode and there are no recorded audio notes, render nothing
  if (!isEditMode && notes.length === 0) {
    return null;
  }

  const isMaxReached = notes.length >= MAX_VOICE_NOTES_PER_PAGE;

  return (
    <div className="w-full max-w-[270px] sm:max-w-[290px] mx-auto bg-white/95 border border-[#ded5c2] rounded-xl p-2 px-2.5 shadow-xs shrink-0 my-1 transition-all">
      {/* Hidden File Input for Audio Upload */}
      <input
        type="file"
        ref={fileAudioInputRef}
        accept="audio/*"
        onChange={handleAudioFileUpload}
        className="hidden"
      />

      {/* Header Tape Strip & Page Limit Badge */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1">
          <WashiTapeStrip 
            color={notes.length > 0 ? 'pink' : 'mint'} 
            className="px-2 py-0.2 text-[9px] font-handwriting font-bold" 
            label={notes.length > 1 ? 'Voice Notes Collage ♡' : notes.length === 1 ? 'Recorded Voice Memo ♡' : 'Audio Storyteller & Voice Notes ♡'} 
          />
        </div>
        
        {/* Limit Indicator (Max 2 as per physical page size) */}
        {isEditMode && (
          <span 
            className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full border ${
              isMaxReached 
                ? 'bg-amber-100/90 text-amber-900 border-amber-300' 
                : 'bg-stone-100 text-stone-600 border-stone-200'
            }`}
            title={`Page Size Limit: Up to ${MAX_VOICE_NOTES_PER_PAGE} voice notes fit comfortably on this chapter spread`}
          >
            {notes.length}/{MAX_VOICE_NOTES_PER_PAGE} {isMaxReached ? 'Full' : ''}
          </span>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ACTIVE MICROPHONE RECORDING IN PROGRESS */}
      {/* ------------------------------------------------------------- */}
      {isRecording && (
        <div className="flex items-center justify-between gap-2 bg-rose-50 border border-rose-200 rounded-lg p-2 animate-pulse mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
            <span className="text-xs font-semibold text-rose-800 font-hand-casual">
              Recording {replacingNoteId ? 'replacement' : `Memo ${notes.length + 1}`} ({formatTime(recordingSeconds)})
            </span>
          </div>
          <button
            onClick={stopRecording}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold shadow-xs cursor-pointer"
          >
            <Square className="w-2.5 h-2.5 fill-current" />
            <span>Save</span>
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* LIST OF RECORDED VOICE NOTES (UP TO 2) */}
      {/* ------------------------------------------------------------- */}
      {notes.length > 0 && (
        <div className="space-y-1.5">
          {notes.map((note, idx) => {
            const isThisPlaying = playingNoteId === note.id;
            return (
              <div 
                key={note.id || idx}
                className={`p-1.5 rounded-lg border transition-all ${
                  isThisPlaying 
                    ? 'bg-amber-50/90 border-amber-300 shadow-xs' 
                    : 'bg-stone-50/80 border-stone-200/80 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {/* Play/Pause Button */}
                  <button
                    onClick={() => handleTogglePlayNote(note)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-white shadow-xs transition-all cursor-pointer shrink-0 ${
                      isThisPlaying
                        ? 'bg-amber-700 hover:bg-amber-800 ring-2 ring-amber-300 scale-105' 
                        : 'bg-[#3b4834] hover:bg-[#2c3727]'
                    }`}
                    title={isThisPlaying ? 'Pause Memo' : 'Play Spoken Memory'}
                  >
                    {isThisPlaying ? (
                      <Pause className="w-2.5 h-2.5 fill-current" />
                    ) : (
                      <Play className="w-2.5 h-2.5 ml-0.5 fill-current" />
                    )}
                  </button>

                  {/* Audio Waveform Equalizer */}
                  <div 
                    onClick={() => handleTogglePlayNote(note)}
                    className="flex-1 flex items-center gap-0.5 h-4 px-1 bg-white/90 hover:bg-stone-100 rounded overflow-hidden cursor-pointer transition-colors"
                    title="Click to play / pause"
                  >
                    {[35, 60, 25, 90, 45, 80, 55, 100, 70, 40, 85, 30, 65, 50, 75, 40, 60].map((h, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all duration-150 ${
                          isThisPlaying ? 'bg-[#3b4834]' : 'bg-stone-300'
                        }`}
                        style={{
                          height: isThisPlaying ? `${Math.max(25, (h * ((i % 3) + 1)) % 100)}%` : `${h * 0.35}%`
                        }}
                      />
                    ))}
                  </div>

                  {/* Duration or Live Playback Timer */}
                  <span className="text-[8px] font-mono text-stone-500 shrink-0">
                    {isThisPlaying ? formatTime(currentPlaybackTime) : formatTime(note.duration || 30)}
                  </span>

                  {/* Edit Controls */}
                  {isEditMode && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => startRecording(note.id)}
                        className="w-5 h-5 rounded-full bg-white hover:bg-rose-50 border border-stone-200 text-stone-600 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer"
                        title="Re-record this memo"
                      >
                        <Mic className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="w-5 h-5 rounded-full bg-white hover:bg-rose-100 border border-stone-200 text-stone-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                        title="Delete this voice note"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Note Label */}
                <div className="flex items-center justify-between text-[8px] text-stone-600 pt-0.5 mt-0.5 border-t border-stone-100">
                  <span className="truncate max-w-[190px] font-hand-casual">
                    {note.label || `Voice Memo #${idx + 1} ♡`}
                  </span>
                  <span className="text-stone-400 font-sans text-[7.5px]">#{idx + 1}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* EDIT MODE: ADD ADDITIONAL NOTE IF WITHIN LIMIT (< 2) */}
      {/* ------------------------------------------------------------- */}
      {isEditMode && !isRecording && (
        <div className="mt-1.5 pt-1.5 border-t border-stone-200/60">
          {!isMaxReached ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-stone-600 font-hand-casual">
                  {notes.length === 0 ? 'Add voice note to this spread:' : 'Add 2nd voice note (max 2):'}
                </span>
                <span className="text-[8px] text-stone-400">Page limit: 2</span>
              </div>

              <div className="flex items-center gap-1">
                {/* 1. Record via Mic */}
                <button
                  onClick={() => startRecording()}
                  className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-[10px] font-semibold shadow-2xs transition-colors cursor-pointer"
                  title="Record voice note with microphone"
                >
                  <Mic className="w-3 h-3 text-rose-600" />
                  <span>{notes.length === 0 ? 'Record Voice' : '+ Record 2nd'}</span>
                </button>

                {/* 2. Upload Audio File */}
                <button
                  onClick={() => fileAudioInputRef.current?.click()}
                  className="px-2 py-1 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 text-[10px] font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                  title="Upload audio file (.mp3, .wav, .m4a)"
                >
                  <Upload className="w-3 h-3 text-stone-600" />
                  <span>Upload</span>
                </button>

                {/* 3. Storyteller Read Aloud */}
                <button
                  onClick={handleToggleStoryteller}
                  className={`px-2 py-1 rounded-lg border text-[10px] font-semibold shadow-2xs transition-all cursor-pointer flex items-center gap-1 ${
                    isStorytellerPlaying
                      ? 'bg-amber-700 text-white border-amber-800 ring-2 ring-amber-300'
                      : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900'
                  }`}
                  title="Listen to chapter text read aloud"
                >
                  {isStorytellerPlaying ? (
                    <>
                      <VolumeX className="w-3 h-3 fill-current" />
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3 h-3 text-amber-700" />
                      <span>Story</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Limit Reached Notice */
            <div className="flex items-center justify-between text-[9px] text-stone-500 bg-stone-50 px-2 py-1 rounded-md border border-stone-200">
              <span>Max 2 voice notes reached for this page layout</span>
              <button
                onClick={handleToggleStoryteller}
                className="text-amber-800 hover:text-amber-950 font-semibold underline decoration-amber-300 flex items-center gap-0.5 cursor-pointer"
                title="Listen to written story aloud"
              >
                <Volume2 className="w-2.5 h-2.5" />
                <span>{isStorytellerPlaying ? 'Stop Story' : 'Read Aloud'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ACTIVE STORYTELLER READING INDICATOR */}
      {/* ------------------------------------------------------------- */}
      {isStorytellerPlaying && (
        <div className="flex items-center justify-between gap-1 p-1 mt-1 bg-amber-50/90 rounded-md border border-amber-200 text-[8px] text-amber-900">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
            <span className="font-semibold truncate max-w-[170px]">Reading "{chapterTitle}"...</span>
          </div>
          <button
            onClick={() => setSpeechSpeed((s) => (s === 1.0 ? 1.2 : s === 1.2 ? 0.8 : 1.0))}
            className="px-1 py-0.2 bg-white rounded border border-amber-300 text-[8px] font-bold cursor-pointer"
            title="Change narration speed"
          >
            {speechSpeed}x
          </button>
        </div>
      )}

      {/* Error Message */}
      {recordError && (
        <p className="text-[8px] text-rose-600 mt-1 bg-rose-50 p-1 rounded-sm border border-rose-200">
          {recordError}
        </p>
      )}
    </div>
  );
}
