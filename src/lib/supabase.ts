import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill them in " +
      "(or, for a deployed build, set them as GitHub Actions repo secrets).",
  );
}

// createClient throws synchronously on an empty URL, which would crash the
// whole app before it can render anything. Fall back to a syntactically
// valid placeholder so the app can still boot and show a clear message via
// isSupabaseConfigured instead of a blank page.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseKey || "placeholder",
);
