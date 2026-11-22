import { z } from "zod";

/**
 * Public env — safe for the browser. Next.js inlines NEXT_PUBLIC_* at build time,
 * so each variable must be referenced literally (no dynamic process.env[key]).
 */
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_MAP_CENTER: z.string().default("20.2961,85.8245"),
});

const parsed = schema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || undefined,
  NEXT_PUBLIC_MAP_CENTER: process.env.NEXT_PUBLIC_MAP_CENTER || undefined,
});

if (!parsed.success) {
  throw new Error(
    `Invalid public environment variables:\n${z.prettifyError(parsed.error)}\nCopy .env.example to .env.local and fill it in.`,
  );
}

export const clientEnv = parsed.data;

export const mapCenter: [number, number] = (() => {
  const [lat, lng] = clientEnv.NEXT_PUBLIC_MAP_CENTER.split(",").map(Number);
  return [lat, lng];
})();
