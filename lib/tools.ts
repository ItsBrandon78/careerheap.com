import { createAdminClient } from '@/lib/supabase/admin';

export interface ToolUsageResult {
  canUse: boolean;
  usesRemaining: number;
}

/**
 * Check and increment tool usage
 * Returns whether user can use the tool and how many uses remain
 */
export async function checkAndIncrementToolUsage(
  toolSlug: string,
  userId?: string,
  anonId?: string
): Promise<ToolUsageResult | null> {
  if (!userId && !anonId) {
    console.error('Either userId or anonId must be provided');
    return null;
  }

  const admin = createAdminClient();

  // Get tool ID from slug
  const { data: tool, error: toolError } = await admin
    .from('tools')
    .select('id')
    .eq('slug', toolSlug)
    .single();

  if (toolError || !tool) {
    console.error('Tool not found:', toolSlug);
    return null;
  }

  // Call the database function
  const { data, error } = await admin.rpc('check_and_increment_tool_usage', {
    p_tool_id: tool.id,
    p_user_id: userId || null,
    p_anon_id: anonId || null,
    p_max_uses: 3,
  });

  if (error) {
    console.error('Error checking tool usage:', error);
    return null;
  }

  if (Array.isArray(data) && data.length > 0) {
    return {
      canUse: data[0].can_use,
      usesRemaining: data[0].uses_remaining,
    };
  }

  return null;
}

/**
 * Get current usage for a tool
 */
export async function getToolUsage(
  toolSlug: string,
  userId?: string,
  anonId?: string
) {
  if (!userId && !anonId) {
    return null;
  }

  const admin = createAdminClient();

  // Get tool ID
  const { data: tool, error: toolError } = await admin
    .from('tools')
    .select('id')
    .eq('slug', toolSlug)
    .single();

  if (toolError || !tool) return null;

  // Get usage record
  const { data: usage, error: usageError } = await admin
    .from('tool_usage')
    .select('count')
    .eq('tool_id', tool.id)
    .or(
      userId
        ? `user_id.eq.${userId}`
        : `anon_id.eq.${anonId}`
    )
    .single();

  if (usageError || !usage) {
    return { count: 0, remaining: 3 };
  }

  return {
    count: usage.count,
    remaining: Math.max(0, 3 - usage.count),
  };
}

/**
 * Get all active tools
 */
export async function getActiveTools() {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('tools')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching tools:', error);
    return [];
  }

  return data || [];
}

/**
 * Get tool by slug
 */
export async function getTool(slug: string) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('tools')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('Error fetching tool:', error);
    return null;
  }

  return data;
}
