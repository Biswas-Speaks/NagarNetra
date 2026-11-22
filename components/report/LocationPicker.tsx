"use client";

import { Crosshair } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PinMap } from "@/components/map";
import { mapCenter } from "@/lib/env/client";
import { useI18n } from "@/lib/i18n";
import { getPosition } from "@/lib/upload";
import { cn } from "@/lib/utils";

export interface PickedLocation {
  lat: number;
  lng: number;
  accuracy: number | null;
  manual: boolean;
}

/** §FR-1.5 — auto GPS; manual pin when denied or accuracy > 100 m. */
export function LocationPicker({ value, onChange }: { value: PickedLocation | null; onChange: (l: PickedLocation) => void }) {
  const { t } = useI18n();
  const [status, setStatus] = useState<"locating" | "ok" | "denied">("locating");

  const locate = useCallback(async () => {
    setStatus("locating");
    try {
      const pos = await getPosition();
      onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy), manual: false });
      setStatus("ok");
    } catch {
      setStatus("denied");
      onChange({ lat: mapCenter[0], lng: mapCenter[1], accuracy: null, manual: true });
    }
  }, [onChange]);

  useEffect(() => {
    if (!value) void locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const weak = value?.accuracy != null && value.accuracy > 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">{t("report.location")}</span>
        <button type="button" onClick={locate} className="flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm text-primary">
          <Crosshair className="h-4 w-4" aria-hidden /> GPS
        </button>
      </div>
      {value ? (
        <PinMap
          position={[value.lat, value.lng]}
          draggable
          onChange={(lat, lng) => onChange({ lat, lng, accuracy: value.accuracy, manual: true })}
        />
      ) : (
        <div className="flex h-56 items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500">
          {t("report.locating")}
        </div>
      )}
      <p className={cn("text-xs", status === "denied" || weak ? "text-amber-700" : "text-slate-500")}>
        {status === "denied"
          ? t("report.locationDenied")
          : value?.accuracy != null && !value.manual
            ? `${t("report.accuracy", { m: value.accuracy })} · ${t("report.dragPin")}`
            : t("report.dragPin")}
      </p>
    </div>
  );
}
