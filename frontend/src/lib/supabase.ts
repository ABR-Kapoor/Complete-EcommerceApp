import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "CRITICAL: Supabase configuration is missing. " +
    "Ensure VITE_SUPABASE_URL and VITE_SUPABASE_KEY are set in your environment variables. " +
    "Note: On Vercel, you must RE-DEPLOY after adding new environment variables."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
