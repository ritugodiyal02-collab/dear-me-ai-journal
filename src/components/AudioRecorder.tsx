import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Sparkles, RefreshCw, Volume2, AlertCircle, Upload, Edit3, Check, X } from 'lucide-react';
import { AudioNote } from '../types';

interface AudioRecorderProps {
  audioNotes: AudioNote[];
  onAddAudioNote: (note: AudioNote) => void;
  onRemoveAudioNote: (id: string) => void;
  onUpdateAudioNote: (id: string, updates: Partial<AudioNote>) => void;
}

export function AudioRecorder({
  audioNotes,
  onAddAudioNote,
  onRemoveAudioNote,
  onUpdateAudioNote
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState<{ [key: string]: number }>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingTranscriptId, setEditingTranscriptId] = useState<string | null>(null);
  const [editingTranscriptText, setEditingTranscriptText] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const durationRef = useRef<number>(0);
  const audioElementsRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  const fileAudioInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      // Clean up audio playback
      Object.values(audioElementsRef.current).forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  const triggerTranscribe = async (noteId: string, base64Audio: string, mimeType: string) => {
    try {
      const resp = await fetch('/api/gemini/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioData: base64Audio, mimeType })
      });
      const data = await resp.json();
      if (data.success && data.transcript) {
        onUpdateAudioNote(noteId, {
          transcript: data.transcript,
          isTranscribing: false
        });
      } else {
        onUpdateAudioNote(noteId, { isTranscribing: false });
      }
    } catch (err) {
      console.error('Auto-transcribe notice:', err);
      onUpdateAudioNote(noteId, { isTranscribing: false });
    }
  };

  const startRecording = async () => {
    setErrorMessage(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage('Audio recording is not supported in this browser environment.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Configure MediaRecorder with voice-optimized bitrate to keep Firestore payloads compact and fast
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, { audioBitsPerSecond: 32000 });
      } catch {
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      durationRef.current = 0;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach((track) => track.stop());

        const elapsedSeconds = Math.max(1, durationRef.current);

        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          const noteId = `audio_${Date.now()}`;
          const newNote: AudioNote = {
            id: noteId,
            url: base64Audio,
            base64: base64Audio,
            duration: elapsedSeconds,
            createdAt: Date.now(),
            isTranscribing: true
          };

          onAddAudioNote(newNote);
          triggerTranscribe(noteId, base64Audio, mimeType);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setRecordingDuration(durationRef.current);
      }, 1000);
    } catch (err: any) {
      console.error('Error starting recording:', err);
      setErrorMessage(err?.message || 'Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mimeType = file.type || 'audio/webm';
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const base64Audio = reader.result as string;
      const noteId = `audio_upload_${Date.now()}`;
      const newNote: AudioNote = {
        id: noteId,
        url: base64Audio,
        base64: base64Audio,
        duration: 30, // Default estimate for uploaded tracks
        createdAt: Date.now(),
        isTranscribing: true
      };

      onAddAudioNote(newNote);
      triggerTranscribe(noteId, base64Audio, mimeType);
    };

    e.target.value = '';
  };

  const togglePlayback = (note: AudioNote) => {
    const source = note.url || note.base64;
    if (!source) return;

    if (playingId === note.id) {
      const audio = audioElementsRef.current[note.id];
      if (audio) {
        audio.pause();
      }
      setPlayingId(null);
    } else {
      // Pause any currently playing
      if (playingId && audioElementsRef.current[playingId]) {
        audioElementsRef.current[playingId].pause();
      }

      let audio = audioElementsRef.current[note.id];
      if (!audio) {
        audio = new Audio(source);
        audioElementsRef.current[note.id] = audio;

        audio.onended = () => {
          setPlayingId(null);
          setPlaybackTime((prev) => ({ ...prev, [note.id]: 0 }));
        };

        audio.ontimeupdate = () => {
          setPlaybackTime((prev) => ({ ...prev, [note.id]: Math.floor(audio.currentTime) }));
        };
      }

      audio.play().catch((e) => console.warn('Audio play notice:', e));
      setPlayingId(note.id);
    }
  };

  const startEditTranscript = (note: AudioNote) => {
    setEditingTranscriptId(note.id);
    setEditingTranscriptText(note.transcript || '');
  };

  const saveEditTranscript = (noteId: string) => {
    onUpdateAudioNote(noteId, { transcript: editingTranscriptText.trim() });
    setEditingTranscriptId(null);
    setEditingTranscriptText('');
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = Math.floor(sec % 60);
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  return (
    <div className="space-y-3">
      {/* Record Bar */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200/90 shadow-2xs">
        <div className="flex items-center gap-3">
          {isRecording ? (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse" />
              <span className="font-mono text-xs font-bold text-rose-700">
                Recording: {formatSeconds(recordingDuration)}
              </span>
              {/* Simulated Waveform Animation */}
              <div className="flex items-center gap-0.5 ml-2">
                <span className="w-1 h-3 bg-rose-500 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1 h-5 bg-rose-500 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1 h-2 bg-rose-500 rounded-full animate-bounce [animation-delay:300ms]" />
                <span className="w-1 h-4 bg-rose-500 rounded-full animate-bounce [animation-delay:75ms]" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-stone-600 text-xs">
              <Volume2 className="w-4 h-4 text-emerald-700" />
              <span className="font-medium">Voice Notes ({audioNotes.length})</span>
              <span className="text-stone-400 text-[11px] hidden sm:inline">• Spoken thoughts & candid reflections</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>Done Recording</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => fileAudioInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 font-medium text-xs shadow-2xs transition-colors cursor-pointer"
                title="Upload audio file (mp3, wav, m4a, webm)"
              >
                <Upload className="w-3.5 h-3.5 text-stone-500" />
                <span>Upload</span>
              </button>

              <button
                onClick={startRecording}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-xs shadow-xs transition-all cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Record Voice Note</span>
              </button>
            </>
          )}

          <input
            ref={fileAudioInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleAudioFileUpload}
          />
        </div>
      </div>

      {errorMessage && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Empty State */}
      {audioNotes.length === 0 && !isRecording && (
        <div 
          onClick={startRecording}
          className="p-8 border-2 border-dashed border-stone-200 hover:border-emerald-700/60 rounded-2xl text-center bg-stone-50/50 hover:bg-emerald-50/20 transition-all cursor-pointer"
        >
          <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 flex items-center justify-center text-emerald-800 mx-auto mb-3 shadow-2xs">
            <Mic className="w-6 h-6 text-emerald-700" />
          </div>
          <p className="text-xs font-semibold text-stone-800">
            Click to record your voice or speak your mind
          </p>
          <p className="text-[11px] text-stone-400 mt-1 max-w-sm mx-auto">
            Your voice note will be saved with this journal entry and automatically transcribed by Gemini
          </p>
        </div>
      )}

      {/* List of Audio Notes */}
      {audioNotes.length > 0 && (
        <div className="space-y-2.5">
          {audioNotes.map((note, index) => {
            const isPlaying = playingId === note.id;
            const currentTime = playbackTime[note.id] || 0;
            const isEditing = editingTranscriptId === note.id;

            return (
              <div
                key={note.id}
                className="p-3.5 rounded-xl bg-white border border-stone-200/90 shadow-2xs flex flex-col gap-2 hover:border-stone-300 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={() => togglePlayback(note)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-all cursor-pointer shrink-0 ${
                        isPlaying ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-800 hover:bg-emerald-900'
                      }`}
                      title={isPlaying ? 'Pause' : 'Play audio note'}
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 fill-white" />
                      ) : (
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-stone-800 truncate">
                          Voice Memo {index + 1}
                        </span>
                        <span className="text-[11px] font-mono text-stone-400 shrink-0">
                          {isPlaying ? `${formatSeconds(currentTime)} / ` : ''}{formatSeconds(note.duration)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {note.isTranscribing ? (
                      <span className="flex items-center gap-1 text-[11px] text-amber-700 font-medium px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Transcribing...
                      </span>
                    ) : note.transcript ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-medium px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        Transcribed
                      </span>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => startEditTranscript(note)}
                      title="Edit transcript / notes"
                      className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveAudioNote(note.id)}
                      title="Delete voice note"
                      className="p-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Spoken Transcript Box / Inline Editor */}
                {isEditing ? (
                  <div className="mt-1 p-2 rounded-lg bg-stone-50 border border-stone-200 flex flex-col gap-1.5">
                    <textarea
                      value={editingTranscriptText}
                      onChange={(e) => setEditingTranscriptText(e.target.value)}
                      placeholder="Add or edit spoken transcript..."
                      rows={2}
                      className="w-full text-xs text-stone-700 bg-white border border-stone-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-700 font-sans resize-none"
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingTranscriptId(null)}
                        className="px-2 py-0.5 rounded text-[11px] text-stone-500 hover:bg-stone-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEditTranscript(note.id)}
                        className="px-2.5 py-0.5 rounded bg-emerald-800 text-white text-[11px] font-medium hover:bg-emerald-900 cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : note.transcript ? (
                  <div className="mt-1 p-2.5 rounded-lg bg-stone-50/80 border border-stone-100 text-xs text-stone-700 italic leading-relaxed">
                    "{note.transcript}"
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
