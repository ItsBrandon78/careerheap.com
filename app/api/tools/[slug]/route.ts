import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAndIncrementToolUsage } from '@/lib/tools';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    // Get or create anonymous ID from cookie
    let anonId = request.cookies.get('ch_anon_id')?.value;
    if (!anonId && !userId) {
      anonId = uuidv4();
    }

    // Check and increment usage
    const result = await checkAndIncrementToolUsage(slug, userId, anonId);

    if (!result) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    const response = NextResponse.json(result);

    // Set anonymous ID cookie if not already set
    if (anonId && !userId) {
      response.cookies.set('ch_anon_id', anonId, {
        maxAge: 60 * 60 * 24 * 365, // 1 year
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('Tool usage error:', error);
    return NextResponse.json(
      { error: 'Failed to check tool usage' },
      { status: 500 }
    );
  }
}
