import { createClient } from '@/lib/supabase/server';

/**
 * Get current user session
 */
export async function getSession() {
  const supabase = await createClient();
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  } catch {
    return null;
  }
}

/**
 * Get current user
 */
export async function getUser() {
  const session = await getSession();
  if (!session) return null;
  return session.user;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated() {
  const session = await getSession();
  return !!session;
}

/**
 * Get user's profile
 */
export async function getUserProfile() {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

/**
 * Check if user is pro
 */
export async function isUserPro() {
  const profile = await getUserProfile();
  return profile?.plan === 'pro' || profile?.plan === 'lifetime';
}
