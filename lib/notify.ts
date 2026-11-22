import "server-only";
import { serverEnv } from "./env/server";

/** §FR-4.4 — optional Telegram alert to a department group. Never throws. */
export async function notifyDepartment(chatId: string | null, text: string) {
  const token = serverEnv().TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.warn("Telegram notify failed", err);
  }
}
