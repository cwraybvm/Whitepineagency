'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Chrome/Edge only -- no polyfill, callers should hide voice UI when
// `supported` is false.
function getSpeechRecognitionCtor(): typeof window.SpeechRecognition | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

export type SpeechToTextError = 'not-supported' | 'permission-denied' | 'no-speech' | 'other';

interface UseSpeechToTextResult {
  supported: boolean;
  listening: boolean;
  transcript: string;
  error: SpeechToTextError | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechToText(): UseSpeechToTextResult {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<SpeechToTextError | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError('not-supported');
      return;
    }
    setError(null);
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const chunk = Array.from(e.results)
        .slice(e.resultIndex)
        .map((r) => r[0].transcript)
        .join(' ');
      setTranscript((prev) => (prev ? `${prev} ${chunk}` : chunk));
    };
    recognition.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setError('permission-denied');
      else if (e.error === 'no-speech') setError('no-speech');
      else setError('other');
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const reset = useCallback(() => setTranscript(''), []);

  return {
    supported: !!getSpeechRecognitionCtor(),
    listening,
    transcript,
    error,
    start,
    stop,
    reset,
  };
}
