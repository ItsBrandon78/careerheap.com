import { useState, useCallback } from 'react';

export interface ToolUsageResult {
  canUse: boolean;
  usesRemaining: number;
}

export function useToolUsage() {
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkUsage = useCallback(async (toolSlug: string): Promise<ToolUsageResult | null> => {
    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch(`/api/tools/${toolSlug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to check tool usage');
      }

      const data = await response.json();
      return data as ToolUsageResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, []);

  return { checkUsage, isChecking, error };
}
