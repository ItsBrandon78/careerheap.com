import { createBrowserClient } from '@supabase/ssr';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

// Return a Supabase client. If the NEXT_PUBLIC_SUPABASE_* env vars are
// missing (e.g. local dev without secrets), return a lightweight mock
// client so the app can boot and non-auth pages render without crashing.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    // Minimal mock implementation used for local dev when credentials
    // aren't available. It implements the subset used by the app: auth
    // listeners, signOut, and a simple `from()` that returns harmless
    // responses. This prevents runtime exceptions while browsing public
    // pages.
    const mock = {
      auth: {
        onAuthStateChange: (
          callback: (event: AuthChangeEvent, session: Session | null) => void
        ) => {
          // Mirror Supabase behavior: emit an initial auth state so UI loading gates can resolve.
          setTimeout(() => {
            callback('INITIAL_SESSION', null);
          }, 0);
          // Immediately return an object shaped like the real API.
          const subscription = { unsubscribe: () => undefined };
          return { data: { subscription }, subscription };
        },
        signOut: async () => ({ error: null }),
      },
      from: (_table: string) => {
        void _table;
        return { select: async () => ({ data: null, error: null }) };
      },
    } as unknown as ReturnType<typeof createBrowserClient>;

    return mock;
  }

  return createBrowserClient(url, anon);
}
