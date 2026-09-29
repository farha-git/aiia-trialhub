import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"];
const supabasePublishableKey =
  import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

export const isSupabaseConfigured = Boolean(
  supabaseUrl?.trim() && supabasePublishableKey?.trim(),
);

export const supabase = createClient(
  supabaseUrl?.trim() || "http://127.0.0.1:54321",
  supabasePublishableKey?.trim() || "missing-supabase-publishable-key",
);