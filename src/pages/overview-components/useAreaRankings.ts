import { useMemo } from "react";

export interface DashboardDistrict {
  id: string;
  name: string;
  normal: number;
  risk: number;
  sick: number;
  referCount?: number;
}

interface UseAreaRankingsResult {
  areasNeedingSupport: DashboardDistrict[];
  modelCommunities: DashboardDistrict[];
  criticalDistricts: DashboardDistrict[];
}

export function useAreaRankings(districts: DashboardDistrict[]): UseAreaRankingsResult {
  // Areas needing support (highest risk)
  const areasNeedingSupport = useMemo(() => {
    return [...districts]
      .sort((a, b) => b.risk - a.risk)
      .slice(0, 3);
  }, [districts]);

  // Model communities (highest normal)
  const modelCommunities = useMemo(() => {
    return [...districts]
      .sort((a, b) => b.normal - a.normal)
      .slice(0, 3);
  }, [districts]);

  // Critical districts (> 20% risk threshold)
  const criticalDistricts = useMemo(() => {
    return districts.filter((d) => {
      const t = d.normal + d.risk + d.sick;
      return t > 0 && d.risk / t >= 0.2;
    });
  }, [districts]);

  return {
    areasNeedingSupport,
    modelCommunities,
    criticalDistricts,
  };
}
