import { useCallback, useEffect, useRef, useState } from "react";
import { dbfsToLevel } from "@/lib/constants";

export interface MicLevel {
  level: number; // 0–100 difficulty-curved loudness (relative, not calibrated dB)
  peak: number; // max level since the last resetPeak/start
  db: number; // approximate current loudness in dBFS (<= 0), for display only
  running: boolean;
  error: string;
  start: () => Promise<void>;
  stop: () => void;
  resetPeak: () => void;
}

interface Opts {
  /** Called at most every `sampleMs` while running — use to stream to Firestore. */
  onSample?: (level: number, peak: number, db: number) => void;
  sampleMs?: number;
}

/**
 * Measures microphone loudness via the Web Audio API and maps it to a relative
 * 0–100 scale. NOTE: this is not a calibrated decibel reading — different phones
 * and rooms are not directly comparable; treat it as a relative loudness meter.
 */
export function useMicLevel(opts?: Opts): MicLevel {
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [db, setDb] = useState(-Infinity);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>();
  const peakRef = useRef(0);
  const lastSampleRef = useRef(0);
  const lastStateRef = useRef(0);
  const onSampleRef = useRef(opts?.onSample);
  onSampleRef.current = opts?.onSample;
  const sampleMs = opts?.sampleMs ?? 250;

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = undefined;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close().catch(() => {});
    streamRef.current = null;
    ctxRef.current = null;
    setRunning(false);
    setLevel(0);
    setDb(-Infinity);
  }, []);

  const resetPeak = useCallback(() => {
    peakRef.current = 0;
    setPeak(0);
  }, []);

  const start = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;
      const Ctx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const data = new Float32Array(analyser.fftSize);

      peakRef.current = 0;
      setPeak(0);
      setRunning(true);

      const loop = () => {
        analyser.getFloatTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
        const rms = Math.sqrt(sum / data.length);
        const dbfs = 20 * Math.log10(rms || 1e-8); // ~ -inf .. 0
        const norm = dbfsToLevel(dbfs); // difficulty-curved 0–100

        if (norm > peakRef.current) {
          peakRef.current = norm;
          setPeak(Math.round(norm));
        }
        const now = performance.now();
        if (now - lastStateRef.current > 60) {
          lastStateRef.current = now;
          setLevel(Math.round(norm));
          setDb(dbfs);
        }
        if (onSampleRef.current && now - lastSampleRef.current > sampleMs) {
          lastSampleRef.current = now;
          onSampleRef.current(norm, peakRef.current, dbfs);
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      console.error(e);
      setError("Microphone access denied. Allow mic permission and try again.");
      setRunning(false);
    }
  }, [sampleMs]);

  useEffect(() => () => stop(), [stop]);

  return { level, peak, db, running, error, start, stop, resetPeak };
}
