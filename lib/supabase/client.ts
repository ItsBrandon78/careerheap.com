import { createBrowserClient } from '@supabase/ssr';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

const MOCK_USERS_KEY = 'careerheap_mock_users';
const MOCK_SESSION_KEY = 'careerheap_mock_session';
const MOCK_PLAN_KEY = 'careerheap_mock_plan';

type MockUserRecord = {
  id: string;
  email: string;
  password: string;
};

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readMockUsers(): MockUserRecord[] {
  if (!canUseStorage()) return [];
  const raw = window.localStorage.getItem(MOCK_USERS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as MockUserRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMockUsers(users: MockUserRecord[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
}

function readMockSession(): Session | null {
  if (!canUseStorage()) return null;
  const raw = window.localStorage.getItem(MOCK_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function writeMockSession(session: Session | null) {
  if (!canUseStorage()) return;
  if (session) {
    window.localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(session));
    return;
  }
  window.localStorage.removeItem(MOCK_SESSION_KEY);
}

function readMockPlan() {
  if (!canUseStorage()) return 'free';
  return window.localStorage.getItem(MOCK_PLAN_KEY) ?? 'free';
}

function buildMockSession(id: string, email: string): Session {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: `mock-access-${id}`,
    token_type: 'bearer',
    expires_in: 60 * 60,
    expires_at: now + 60 * 60,
    refresh_token: `mock-refresh-${id}`,
    user: {
      id,
      email,
      app_metadata: { provider: 'email' },
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString()
    }
  } as Session;
}

// Return a Supabase client. If the NEXT_PUBLIC_SUPABASE_* env vars are
// missing (e.g. local dev without secrets), return a lightweight mock
// client so the app can boot and non-auth pages render without crashing.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!url || !anon) {
    // Local dev mock when Supabase env vars are unavailable.
    const listeners = new Set<
      (event: AuthChangeEvent, session: Session | null) => void | Promise<void>
    >();
    let mockSession = readMockSession();

    const emit = (event: AuthChangeEvent, session: Session | null) => {
      listeners.forEach((listener) => {
        void listener(event, session);
      });
    };

    const getUserByEmail = (email: string) =>
      readMockUsers().find((user) => user.email.toLowerCase() === email.toLowerCase());

    const getProfileRow = (id: string) => ({ id, plan: readMockPlan() });

    const mock = {
      auth: {
        onAuthStateChange: (
          callback: (event: AuthChangeEvent, session: Session | null) => void
        ) => {
          listeners.add(callback);
          // Mirror Supabase behavior: emit an initial auth state so UI loading gates can resolve.
          setTimeout(() => {
            callback('INITIAL_SESSION', mockSession);
          }, 0);
          // Immediately return an object shaped like the real API.
          const subscription = {
            unsubscribe: () => {
              listeners.delete(callback);
            },
          };
          return { data: { subscription }, subscription };
        },
        getSession: async () => ({ data: { session: mockSession }, error: null }),
        signInWithOtp: async ({
          email,
        }: {
          email: string;
          options?: { emailRedirectTo?: string };
        }) => {
          if (!email) {
            return { data: { user: null, session: null }, error: new Error('Email is required') };
          }
          let user = getUserByEmail(email);
          if (!user) {
            user = {
              id: crypto.randomUUID(),
              email,
              password: '',
            };
            const users = readMockUsers();
            users.push(user);
            writeMockUsers(users);
          }

          mockSession = buildMockSession(user.id, user.email);
          writeMockSession(mockSession);
          emit('SIGNED_IN', mockSession);

          return { data: { user: mockSession.user, session: mockSession }, error: null };
        },
        signUp: async ({
          email,
          password,
        }: {
          email: string;
          password: string;
          options?: { emailRedirectTo?: string };
        }) => {
          if (!email || !password) {
            return {
              data: { user: null, session: null },
              error: new Error('Email and password are required'),
            };
          }
          if (password.length < 6) {
            return {
              data: { user: null, session: null },
              error: new Error('Password should be at least 6 characters'),
            };
          }

          const existing = getUserByEmail(email);
          if (existing) {
            return {
              data: { user: null, session: null },
              error: new Error('User already registered'),
            };
          }

          const users = readMockUsers();
          const newUser: MockUserRecord = {
            id: crypto.randomUUID(),
            email,
            password,
          };
          users.push(newUser);
          writeMockUsers(users);

          return {
            data: {
              user: { id: newUser.id, email: newUser.email },
              session: null,
            },
            error: null,
          };
        },
        signInWithPassword: async ({
          email,
          password,
        }: {
          email: string;
          password: string;
        }) => {
          const user = getUserByEmail(email);
          if (!user || user.password !== password) {
            return {
              data: { user: null, session: null },
              error: new Error('Invalid login credentials'),
            };
          }

          mockSession = buildMockSession(user.id, user.email);
          writeMockSession(mockSession);
          emit('SIGNED_IN', mockSession);

          return {
            data: { user: mockSession.user, session: mockSession },
            error: null,
          };
        },
        signOut: async () => {
          mockSession = null;
          writeMockSession(null);
          emit('SIGNED_OUT', null);
          return { error: null };
        },
      },
      from: (_table: string) => {
        const state = { table: _table, filters: {} as Record<string, string> };
        return {
          select: (_fields: string) => {
            void _fields;
            return {
              eq: (column: string, value: string) => {
                state.filters[column] = value;
                return {
                  single: async () => {
                    if (state.table === 'profiles' && state.filters.id) {
                      return { data: getProfileRow(state.filters.id), error: null };
                    }
                    return { data: null, error: null };
                  },
                };
              },
              single: async () => ({ data: null, error: null }),
            };
          },
        };
      },
    } as unknown as ReturnType<typeof createBrowserClient>;

    return mock;
  }

  return createBrowserClient(url, anon);
}
