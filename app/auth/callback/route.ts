import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

function safeNextPath(value: string | null) {
  return value && value.startsWith('/') ? value : '/tools'
}

function toLoginRedirectUrl(requestUrl: URL, nextPath: string, reason: string) {
  const loginUrl = new URL('/login', requestUrl.origin)
  loginUrl.searchParams.set('auth_error', reason)
  loginUrl.searchParams.set('next', nextPath)
  return loginUrl
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = safeNextPath(requestUrl.searchParams.get('next'))
  const authProviderError = requestUrl.searchParams.get('error')

  if (authProviderError) {
    return NextResponse.redirect(toLoginRedirectUrl(requestUrl, next, 'oauth_cancelled'))
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        toLoginRedirectUrl(requestUrl, next, 'callback_exchange_failed')
      );
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
