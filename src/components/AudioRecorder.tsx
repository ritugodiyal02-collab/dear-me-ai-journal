import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Sparkles, RefreshCw, Volume2, AlertCircle } from 'lucide-react';
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioElementsRef = useRef<{ [key: string]: HTMLAudioElement }>({});

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

  const startRecording = async () => {
    setErrorMessage(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage('Audio recording is not supported in this browser environment.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach((track) => track.stop());

        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          const noteId = `audio_${Date.now()}`;
          const newNote: AudioNote = {
            id: noteId,
            base64: base64Audio,
            duration: recordingDuration || 1,
            createdAt: Date.now(),
            isTranscribing: true
          };

          onAddAudioNote(newNote);

          // Automatically transcribe with Gemini
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
            console.error('Auto-transcribe failed:', err);
            onUpdateAudioNote(noteId, { isTranscribing: false });
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error starting recording:', err);
      setErrorMessage(err?.message || 'Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const togglePlayback = (note: AudioNote) => {
    if (!note.base64) return;

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
        audio = new Audio(note.base64);
        audioElementsRef.current[note.id] = audio;

        audio.onended = () => {
          setPlayingId(null);
          setPlaybackTime((prev) => ({ ...prev, [note.id]: 0 }));
        };

        audio.ontimeupdate = () => {
          setPlaybackTime((prev) => ({ ...prev, [note.id]: Math.floor(audio.currentTime) }));
        };
      }

      audio.play();
      setPlayingId(note.id);
    }
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

        <div>
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>Done</span>
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-xs shadow-xs transition-all cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Record Voice Note</span>
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* List of Audio Notes */}
      {audioNotes.length > 0 && (
        <div className="space-y-2">
          {audioNotes.map((note, index) => {
            const isPlaying = playingId === note.id;
            const currentTime = playbackTime[note.id] || 0;

            return (
              <div
                key={note.id}
                className="p-3 rounded-xl bg-white border border-stone-200/90 shadow-2xs flex flex-col gap-2 hover:border-stone-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => togglePlayback(note)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-white transition-all cursor-pointer ${
                        isPlaying ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-800 hover:bg-emerald-900'
                      }`}
                      title={isPlaying ? 'Pause' : 'Play audio note'}
                    >
                      {isPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-white" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                      )}
                    </button>

                    <span className="text-xs font-semibold text-stone-800">
                      Voice Memo {index + 1}
                    </span>

                    <span className="text-[11px] font-mono text-stone-400">
                      {isPlaying ? `${formatSeconds(currentTime)} / ` : ''}{formatSeconds(note.duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
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
                      onClick={() => onRemoveAudioNote(note.id)}
                      title="Delete voice note"
                      className="p-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Spoken Transcript Box */}
                {note.transcript && (
                  <div className="mt-1 p-2.5 rounded-lg bg-stone-50/80 border border-stone-100 text-xs text-stone-700 italic leading-relaxed">
                    "{note.transcript}"
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
