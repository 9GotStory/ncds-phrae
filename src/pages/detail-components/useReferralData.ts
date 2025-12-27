import { useMemo } from "react";

export interface ReferralArea {
  name: string;
  sub: string;
  referCount: number;
}

interface UseReferralDataParams {
  data?: {
    districts?: Array<{ referCount?: number }>;
    detailTable?: Array<{ referCount?: number; district: string; subdistrict: string; village: string }>;
  };
}

interface UseReferralDataResult {
  totalRefer: number;
  referLocationsCount: number;
  referralAreas: ReferralArea[];
}

export function useReferralData({
  data,
}: UseReferralDataParams): UseReferralDataResult {
  // Calculate total referrals
  const totalRefer = useMemo(() => {
    if (data?.districts) {
      return data.districts.reduce((sum, d) => sum + (d.referCount || 0), 0);
    }
    if (data?.detailTable) {
      return data.detailTable.reduce((sum, r) => sum + (r.referCount || 0), 0);
    }
    return 0;
  }, [data]);

  // Count locations with referrals
  const referLocationsCount = useMemo(() => {
    if (data?.districts) {
      return data.districts.filter((d) => (d.referCount || 0) > 0).length;
    }
    if (data?.detailTable) {
      return data.detailTable.filter((r) => (r.referCount || 0) > 0).length;
    }
    return 0;
  }, [data]);

  // Build referral areas list
  const referralAreas = useMemo(() => {
    if (data?.detailTable && data.detailTable.length > 0) {
      const map = new Map<string, ReferralArea>();

      data.detailTable.forEach((row) => {
        if (!row.referCount) return;
        const key = `${row.district}-${row.subdistrict}-${row.village}`;
        const exist = map.get(key) || {
          name: row.village,
          sub: `ต.${row.subdistrict}`,
          referCount: 0,
        };
        exist.referCount += row.referCount;
        map.set(key, exist);
      });

      return Array.from(map.values()).sort((a, b) => b.referCount - a.referCount);
    }
    return [];
  }, [data]);

  return {
    totalRefer,
    referLocationsCount,
    referralAreas,
  };
}
