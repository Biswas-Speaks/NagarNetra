"use client";

import { Camera, ImageIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { compressImage } from "@/lib/upload";

/** Camera tile (rear camera via `capture`) + gallery picker. Emits a compressed WebP. */
export function CameraCapture({ value, onChange }: { value: File | null; onChange: (f: File | null) => void }) {
  const { t } = useI18n();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!value) return setPreview(null);
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      onChange(await compressImage(file));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handle} />
      <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" hidden onChange={handle} />
      {preview ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
          <img src={preview} alt="" className="aspect-[4/3] w-full rounded-2xl object-cover" />
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="absolute right-2 bottom-2 rounded-lg bg-black/70 px-3 py-2 text-sm font-medium text-white"
          >
            {t("report.retake")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={busy}
          className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 text-primary"
        >
          <Camera className="h-14 w-14" aria-hidden />
          <span className="text-lg font-semibold">{busy ? t("common.loading") : t("report.photo")}</span>
        </button>
      )}
      <button
        type="button"
        onClick={() => galleryRef.current?.click()}
        className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 text-sm font-medium text-slate-600"
      >
        <ImageIcon className="h-4 w-4" aria-hidden /> {t("report.gallery")}
      </button>
    </div>
  );
}
