import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hoursBetween(a: string | Date, b: string | Date = new Date()) {
  return (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000;
}

export function formatDateTime(iso: string, lang: string) {
  const locale = lang === "or" ? "or-IN" : lang === "hi" ? "hi-IN" : "en-IN";
  return new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

/** Reads an API error body ({ error: { message } }) into a readable string. */
export async function apiErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    return body.error?.message ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}
