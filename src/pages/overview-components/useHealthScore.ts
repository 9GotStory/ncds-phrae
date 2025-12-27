import { useMemo } from "react";

interface UseHealthScoreParams {
  summary?: { normal?: number; total?: number };
  totalPop: number;
}

export function useHealthScore({ summary, totalPop }: UseHealthScoreParams): number {
  return useMemo(() => {
    if (!totalPop) return 0;
    const normal = summary?.normal || 0;
    // Health Score: % Normal / Total * 100
    return Math.min(100, (normal / totalPop) * 100);
  }, [summary, totalPop]);
}
