import { createClient } from '@supabase/supabase-js';

/**
 * Admin client using Supabase secret key (or legacy service role key)
 * Only use server-side for sensitive operations
 * DO NOT expose this key to the client
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !adminKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SECRET_KEY (legacy fallback: SUPABASE_SERVICE_ROLE_KEY)'
    );
  }

  return createClient(
    url,
    adminKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
