import { createBrowserClient } from '@supabase/ssr';

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
        onAuthStateChange: (cb: any) => {
          // Immediately return an object shaped like the real API.
          const subscription = { unsubscribe: () => undefined };
          return { data: { subscription }, subscription };
        },
        signOut: async () => ({ error: null }),
      },
      from: (_: string) => ({ select: async () => ({ data: null, error: null }) }),
    } as any;

    return mock;
  }

  return createBrowserClient(url, anon);
}
