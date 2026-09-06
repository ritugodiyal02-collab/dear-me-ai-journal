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

  // Remove all voice notes from this chapter spread
  const handleRemoveAllNotes = () => {
    stopPlayback();
    commitNotes([]);
  };

  // If no notes exist:
  if (notes.length === 0) {
    if (isRecording) {
      return (
        <div className="w-full max-w-[280px] sm:max-w-[310px] mx-auto bg-white/95 border border-[#dfd6c5] rounded-xl p-2.5 sm:p-3 shadow-xs shrink-0 my-2 relative transition-all">
          <div className="flex items-center justify-between gap-2 bg-rose-50 border border-rose-200 rounded-lg p-2 animate-pulse">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
              <span className="text-xs font-semibold text-rose-800 font-hand-casual">
                Recording Voice Memo ({formatTime(recordingSeconds)})
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
        </div>
      );
    }

    if (!isEditMode) {
      return null;
    }

    return (
      <div className="w-full max-w-[280px] sm:max-w-[310px] mx-auto shrink-0 my-1.5">
        <input
          type="file"
          ref={fileAudioInputRef}
          accept="audio/*"
          onChange={handleAudioFileUpload}
          className="hidden"
        />
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-dashed border-stone-300/90 bg-stone-50/70 hover:bg-stone-100/90 transition-colors">
          <div className="flex items-center gap-1.5 text-stone-600 text-xs font-hand-casual">
            <Volume2 className="w-3.5 h-3.5 text-stone-500" />
            <span>Voice Memo (Optional)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              id="btn-voice-note-add-record"
              onClick={() => startRecording()}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-[10px] font-semibold transition-colors cursor-pointer"
              title="Record voice note"
            >
              <Mic className="w-2.5 h-2.5 text-rose-600" />
              <span>Record</span>
            </button>
            <button
              id="btn-voice-note-add-upload"
              onClick={() => fileAudioInputRef.current?.click()}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-600 text-[10px] transition-colors cursor-pointer"
              title="Upload audio file"
            >
              <Upload className="w-2.5 h-2.5" />
              <span>Upload</span>
            </button>
          </div>
        </div>
        {recordError && (
          <p className="text-[9px] text-rose-600 mt-1 bg-rose-50 p-1 rounded-sm border border-rose-200">
            {recordError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-[280px] sm:max-w-[310px] mx-auto bg-white/95 border border-[#dfd6c5] rounded-xl p-2.5 sm:p-3 shadow-xs shrink-0 my-2 relative transition-all">
      {/* Hidden File Input for Audio Upload */}
      <input
        type="file"
        ref={fileAudioInputRef}
        accept="audio/*"
        onChange={handleAudioFileUpload}
        className="hidden"
      />

      {/* Header Tape Strip matching reference image: A Voice Note ♡ */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <WashiTapeStrip 
            color="mint" 
            className="px-2.5 py-0.5 text-[9.5px] font-handwriting font-bold tracking-wide" 
            label="A Voice Note ♡" 
            rotation={-0.5}
          />
        </div>
        
        {/* Discreet Edit Mode Actions */}
        {isEditMode && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => startRecording()}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-[9px] font-semibold transition-colors cursor-pointer"
              title="Record your voice note"
            >
              <Mic className="w-2.5 h-2.5 text-rose-600" />
              <span>Record</span>
            </button>
            <button
              onClick={() => fileAudioInputRef.current?.click()}
              className="p-1 rounded-full bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-600 transition-colors cursor-pointer"
              title="Upload audio file"
            >
              <Upload className="w-2.5 h-2.5" />
            </button>
            <button
              id="btn-remove-voice-note-card"
              onClick={handleRemoveAllNotes}
              className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 hover:text-rose-900 text-[9px] font-semibold transition-colors cursor-pointer ml-0.5"
              title="Remove voice note from chapter"
            >
              <Trash2 className="w-2.5 h-2.5" />
              <span>Remove</span>
            </button>
          </div>
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
              Recording Voice Memo ({formatTime(recordingSeconds)})
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
      {/* CLEAN VOICE NOTE PLAYER CARD (MATCHING REFERENCE IMAGE) */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-2">
        {notes.map((note, idx) => {
          const isThisPlaying = playingNoteId === note.id || (playingNoteId === null && isStorytellerPlaying && note.id.startsWith('default_memo'));
          
          return (
            <div 
              key={note.id || idx}
              className="flex items-center gap-2.5 py-1 px-0.5 group"
            >
              {/* Dark Circular Play Button */}
              <button
                onClick={() => {
                  if (note.url) {
                    handleTogglePlayNote(note);
                  } else {
                    handleToggleStoryteller();
                  }
                }}
                className="w-8 h-8 rounded-full bg-[#262626] hover:bg-[#151515] text-white flex items-center justify-center shadow-xs cursor-pointer shrink-0 transition-transform active:scale-95"
                title={isThisPlaying ? 'Pause Voice Note' : 'Play Voice Note'}
              >
                {isThisPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
                )}
              </button>

              {/* Sage Green Waveform Audio Bars */}
              <div 
                onClick={() => {
                  if (note.url) {
                    handleTogglePlayNote(note);
                  } else {
                    handleToggleStoryteller();
                  }
                }}
                className="flex-1 flex items-center justify-between gap-[2px] h-7 px-1 rounded-sm cursor-pointer select-none"
                title="Click to play / pause voice note"
              >
                {[4, 7, 12, 18, 9, 14, 20, 24, 16, 10, 15, 22, 18, 12, 8, 14, 19, 23, 17, 11, 6, 4, 3, 2].map((barHeight, i) => (
                  <div
                    key={i}
                    className={`w-[2.5px] rounded-full transition-all duration-200 ${
                      isThisPlaying ? 'bg-[#3b533d]' : 'bg-[#5b755f]'
                    }`}
                    style={{
                      height: isThisPlaying 
                        ? `${Math.max(6, ((barHeight * (i % 3 + 1)) % 24) + 4)}px` 
                        : `${barHeight}px`
                    }}
                  />
                ))}
              </div>

              {/* Monospace Timestamp */}
              <span className="text-xs font-mono font-medium text-stone-700 shrink-0 select-none">
                {isThisPlaying 
                  ? formatTime(currentPlaybackTime) 
                  : (note.duration ? formatTime(note.duration) : '01:32')}
              </span>

              {/* Delete Button for Notes in Edit Mode */}
              {isEditMode && (
                <button
                  id={`btn-delete-voice-note-${note.id}`}
                  onClick={() => handleDeleteNote(note.id)}
                  className="w-6 h-6 rounded-full hover:bg-rose-100 text-stone-400 hover:text-rose-700 flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-0.5"
                  title="Remove this voice note"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Spoken Reflection Indicator when active */}
      {isStorytellerPlaying && (
        <div className="flex items-center justify-between gap-1 p-1 mt-1.5 bg-amber-50/90 rounded-md border border-amber-200 text-[8.5px] text-amber-900 animate-pulse">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
            <span className="font-semibold truncate">Playing spoken memory for "{chapterTitle}"...</span>
          </div>
          <button
            onClick={stopPlayback}
            className="text-[8px] font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer"
          >
            Stop
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
