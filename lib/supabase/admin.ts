import { createClient } from '@supabase/supabase-js';

/**
 * Admin client using service role key
 * Only use server-side for sensitive operations
 * DO NOT expose this key to the client
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
