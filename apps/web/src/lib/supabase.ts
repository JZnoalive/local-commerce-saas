import { createClient } from '@supabase/supabase-js';

const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const rawKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

const supabaseUrl =
  rawUrl && /^https?:\/\//i.test(rawUrl)
    ? rawUrl
    : 'https://placeholder.supabase.co';

const supabaseAnonKey = rawKey || 'public-anon-key-placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
