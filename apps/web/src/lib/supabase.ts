import { createClient } from '@supabase/supabase-js';

const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/^["']|["']$/g, '');
const rawKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim().replace(/^["']|["']$/g, '');

const normalizedUrl =
  rawUrl && !/^https?:\/\//i.test(rawUrl) && rawUrl.includes('.supabase.co')
    ? `https://${rawUrl}`
    : rawUrl;

export const supabaseUrl =
  normalizedUrl && /^https?:\/\//i.test(normalizedUrl)
    ? normalizedUrl
    : 'https://placeholder.supabase.co';

const supabaseAnonKey = rawKey || 'public-anon-key-placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
