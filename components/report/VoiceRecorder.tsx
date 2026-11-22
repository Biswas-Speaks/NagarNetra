"use client";

import { Mic, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const MAX_SECONDS = 60;

function pickMime() {
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  return options.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? "";
}

/** Big tap-to-record mic button with 60 s cap and live level meter (§17.3). */
export function VoiceRecorder({ value, onChange }: { value: Blob | null; onChange: (b: Blob | null) => void }) {
  const { t } = useI18n();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const cleanupRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!value) return setUrl(null);
    const u = URL.createObjectURL(value);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [value]);

  useEffect(() => () => cleanupRef.current(), []);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMime();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        onChange(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
        cleanupRef.current();
      };

      // Level meter for visual feedback
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      let raf = 0;
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        setLevel(Math.min(1, (Math.max(...buf) - 128) / 64));
        raf = requestAnimationFrame(tick);
      };
      tick();

      const started = Date.now();
      const timer = setInterval(() => {
        const s = Math.floor((Date.now() - started) / 1000);
        setSeconds(s);
        if (s >= MAX_SECONDS && rec.state === "recording") rec.stop();
      }, 250);

      cleanupRef.current = () => {
        clearInterval(timer);
        cancelAnimationFrame(raf);
        stream.getTracks().forEach((tr) => tr.stop());
        ctx.close().catch(() => undefined);
        setRecording(false);
        setLevel(0);
      };

      recorderRef.current = rec;
      rec.start();
      setSeconds(0);
      setRecording(true);
    } catch {
      setError(t("report.micDenied"));
    }
  }

  function stop() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={recording ? stop : start}
        aria-pressed={recording}
        className={cn(
          "relative flex h-24 w-24 items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-95",
          recording ? "bg-red-600" : "bg-accent",
        )}
        style={recording ? { boxShadow: `0 0 0 ${4 + level * 20}px rgba(220,38,38,0.25)` } : undefined}
      >
        {recording ? <Square className="h-10 w-10" aria-hidden /> : <Mic className="h-11 w-11" aria-hidden />}
        <span className="sr-only">{recording ? t("report.stop") : t("report.record")}</span>
      </button>
      <p className="text-sm font-medium text-slate-700">
        {recording ? `${t("report.recording")} ${seconds}s / ${MAX_SECONDS}s` : value ? t("report.rerecord") : t("report.record")}
      </p>
      {url && !recording && (
        <div className="flex w-full items-center gap-2">
          <audio src={url} controls className="h-10 flex-1" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-lg p-3 text-slate-500 hover:bg-slate-100"
            aria-label="Delete recording"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
