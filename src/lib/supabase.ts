import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** null când Supabase nu e configurat — modulele trec atunci pe fallback local. */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;

export const shareBucket = (import.meta.env.VITE_SUPABASE_SHARE_BUCKET as string | undefined) || "shares";
