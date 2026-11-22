"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { uploadFiles } from "@/lib/upload";
import { apiErrorMessage } from "@/lib/utils";
import { CameraCapture } from "./CameraCapture";
import { LocationPicker, type PickedLocation } from "./LocationPicker";
import { ResultCard, type ReportResponse } from "./ResultCard";
import { SubmitProgress, type Step } from "./SubmitProgress";
import { VoiceRecorder } from "./VoiceRecorder";

/** §17.3 — capture → location → submit, all on one mobile screen. */
export function ReportWizard() {
  const { t, lang } = useI18n();
  const [photo, setPhoto] = useState<File | null>(null);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [text, setText] = useState("");
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<Step | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReportResponse | null>(null);

  const hasContent = Boolean(photo || audio || text.trim());

  function reset() {
    setPhoto(null);
    setAudio(null);
    setText("");
    setResult(null);
    setStep(null);
    setError(null);
  }

  async function submit() {
    if (!hasContent) return setError(t("report.needOne"));
    if (!location) return setError(t("report.needLocation"));
    setError(null);
    try {
      setStep("uploading");
      const paths = await uploadFiles([
        ...(photo ? [{ kind: "photo" as const, blob: photo }] : []),
        ...(audio ? [{ kind: "audio" as const, blob: audio }] : []),
      ]);

      setStep("understanding");
      // Triage and routing happen in one server call; advance the label midway for feedback.
      const routingTimer = setTimeout(() => setStep("routing"), 3500);
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo_path: paths.photo ?? null,
          audio_path: paths.audio ?? null,
          text: text.trim() || null,
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy,
          ui_lang: lang,
          reporter: name || phone ? { name: name || null, phone: phone || null } : null,
        }),
      }).finally(() => clearTimeout(routingTimer));
      if (!res.ok) throw new Error(await apiErrorMessage(res));

      setStep("done");
      setResult((await res.json()) as ReportResponse);
    } catch (err) {
      setStep(null);
      setError(err instanceof Error ? err.message : t("report.error"));
    }
  }

  if (result) return <ResultCard result={result} onAnother={reset} />;

  if (step) {
    return (
      <Card className="py-8">
        <SubmitProgress step={step} />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <CameraCapture value={photo} onChange={setPhoto} />
        <VoiceRecorder value={audio} onChange={setAudio} />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 500))}
          placeholder={t("report.textPlaceholder")}
          rows={2}
          className="w-full rounded-xl border border-slate-300 p-3 text-base"
        />
      </Card>

      <Card>
        <LocationPicker value={location} onChange={setLocation} />
      </Card>

      <details className="rounded-2xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">{t("report.contact")}</summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("report.name")}
            autoComplete="name"
            maxLength={80}
            className="h-12 rounded-xl border border-slate-300 px-3"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("report.phone")}
            inputMode="tel"
            autoComplete="tel"
            maxLength={15}
            className="h-12 rounded-xl border border-slate-300 px-3"
          />
        </div>
      </details>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <Button size="lg" className="w-full" onClick={submit} disabled={!hasContent || !location}>
        {t("report.submit")}
      </Button>
    </div>
  );
}
