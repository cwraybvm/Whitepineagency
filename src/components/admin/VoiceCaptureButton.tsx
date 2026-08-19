'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Mic, MicOff } from 'lucide-react';
import { useSpeechToText } from '@/hooks/useSpeechToText';

interface VoiceCaptureButtonProps {
  onTranscript: (text: string) => void;
  idleLabel?: string;
  listeningLabel?: string;
  className?: string;
}

export default function VoiceCaptureButton({
  onTranscript,
  idleLabel = '🎙️ Dictate',
  listeningLabel = '🔴 Listening…',
  className,
}: VoiceCaptureButtonProps) {
  const { supported, listening, transcript, error, start, stop, reset } = useSpeechToText();
  const wasListening = useRef(false);

  // Hand the finished transcript up when recognition ends, whether that's
  // from the user clicking Stop or the browser auto-ending on silence.
  useEffect(() => {
    if (wasListening.current && !listening && transcript.trim()) {
      onTranscript(transcript.trim());
      reset();
    }
    wasListening.current = listening;
  }, [listening, transcript, onTranscript, reset]);

  useEffect(() => {
    if (!error) return;
    if (error === 'permission-denied') toast.error('Microphone access denied.');
    else if (error === 'no-speech') toast.error('No speech detected.');
    else if (error === 'not-supported') toast.error('Voice capture is not supported in this browser.');
    else toast.error('Voice capture failed.');
  }, [error]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={() => (listening ? stop() : start())}
      title={listening ? 'Stop dictating' : 'Dictate with voice'}
      className={
        className ||
        `flex items-center justify-center gap-1.5 min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-medium ${
          listening ? 'bg-red-500/20 text-red-300 animate-pulse' : 'bg-white/5 text-gray-400 hover:bg-white/10'
        }`
      }
    >
      {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
      {listening ? listeningLabel : idleLabel}
    </button>
  );
}
