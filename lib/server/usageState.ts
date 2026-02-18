export type PlanType = 'free' | 'pro' | 'lifetime';

export type ToolUsageMap = Record<string, number>;

export interface ActorUsage {
  total: number;
  byTool: ToolUsageMap;
}

interface UsageState {
  version: 1;
  users: Record<string, ActorUsage>;
  anons: Record<string, ActorUsage>;
}

const EMPTY_USAGE: ActorUsage = {
  total: 0,
  byTool: {},
};

const EMPTY_STATE: UsageState = {
  version: 1,
  users: {},
  anons: {},
};

export const FREE_LIFETIME_LIMIT = 3;

export interface UsageSummary {
  plan: PlanType;
  isUnlimited: boolean;
  canUse: boolean;
  used: number;
  limit: number;
  usesRemaining: number | null;
  byTool: ToolUsageMap;
}

function sanitizeActorUsage(value: unknown): ActorUsage {
  if (!value || typeof value !== 'object') {
    return { ...EMPTY_USAGE };
  }

  const raw = value as Partial<ActorUsage>;
  const byTool = raw.byTool && typeof raw.byTool === 'object' ? raw.byTool : {};
  const safeByTool: ToolUsageMap = {};

  for (const [tool, count] of Object.entries(byTool)) {
    if (!tool || typeof tool !== 'string') continue;
    const parsed = Number(count);
    if (Number.isFinite(parsed) && parsed > 0) {
      safeByTool[tool] = Math.floor(parsed);
    }
  }

  const totalFromTools = Object.values(safeByTool).reduce((sum, count) => sum + count, 0);
  const total = Number.isFinite(Number(raw.total)) ? Math.max(Math.floor(Number(raw.total)), totalFromTools) : totalFromTools;

  return {
    total,
    byTool: safeByTool,
  };
}

export function parseUsageState(rawCookie: string | undefined): UsageState {
  if (!rawCookie) {
    return { ...EMPTY_STATE };
  }

  try {
    const decoded = Buffer.from(rawCookie, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as Partial<UsageState>;
    if (!parsed || parsed.version !== 1) {
      return { ...EMPTY_STATE };
    }

    const users: Record<string, ActorUsage> = {};
    const anons: Record<string, ActorUsage> = {};

    for (const [id, usage] of Object.entries(parsed.users ?? {})) {
      if (!id) continue;
      users[id] = sanitizeActorUsage(usage);
    }

    for (const [id, usage] of Object.entries(parsed.anons ?? {})) {
      if (!id) continue;
      anons[id] = sanitizeActorUsage(usage);
    }

    return {
      version: 1,
      users,
      anons,
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}

export function serializeUsageState(state: UsageState): string {
  return Buffer.from(JSON.stringify(state), 'utf8').toString('base64url');
}

export function getActorUsage(state: UsageState, actorId: string, isUser: boolean): ActorUsage {
  if (!actorId) {
    return { ...EMPTY_USAGE };
  }

  const source = isUser ? state.users : state.anons;
  const usage = source[actorId];
  if (!usage) {
    return { ...EMPTY_USAGE };
  }

  return sanitizeActorUsage(usage);
}

export function incrementActorUsage(
  state: UsageState,
  actorId: string,
  toolSlug: string,
  isUser: boolean
): ActorUsage {
  const source = isUser ? state.users : state.anons;
  const current = getActorUsage(state, actorId, isUser);
  const nextToolCount = (current.byTool[toolSlug] ?? 0) + 1;
  const nextByTool = {
    ...current.byTool,
    [toolSlug]: nextToolCount,
  };

  const next: ActorUsage = {
    total: current.total + 1,
    byTool: nextByTool,
  };

  source[actorId] = next;
  return next;
}

export function parsePlan(value: string | null | undefined): PlanType | null {
  if (value !== 'free' && value !== 'pro' && value !== 'lifetime') {
    return null;
  }
  return value;
}

export function parseUsesOverride(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const rounded = Math.floor(parsed);
  if (rounded < 0 || rounded > FREE_LIFETIME_LIMIT) {
    return null;
  }

  return rounded;
}

export function getUsageSummary({
  plan,
  usageTotal,
  byTool = {},
}: {
  plan: PlanType;
  usageTotal: number;
  byTool?: ToolUsageMap;
}): UsageSummary {
  const safeUsage = Math.max(0, Math.floor(usageTotal));
  const isUnlimited = plan === 'pro' || plan === 'lifetime';
  const used = isUnlimited ? 0 : Math.min(FREE_LIFETIME_LIMIT, safeUsage);
  const usesRemaining = isUnlimited ? null : Math.max(FREE_LIFETIME_LIMIT - used, 0);

  return {
    plan,
    isUnlimited,
    canUse: isUnlimited ? true : used < FREE_LIFETIME_LIMIT,
    used,
    limit: FREE_LIFETIME_LIMIT,
    usesRemaining,
    byTool,
  };
}
