import { useMemo } from "react";

interface DetailTableRow {
  district: string;
  subdistrict: string;
  village: string;
  moo?: string;
  normal: number;
  risk: number;
  sick: number;
  year?: number;
  month?: number;
}

interface ComparisonStats {
  periodLabel: string;
  screenedChange: number;
  riskChange: number;
}

export function useComparisonStats(detailTable: DetailTableRow[]): ComparisonStats | null {
  return useMemo(() => {
    if (!detailTable || detailTable.length === 0) return null;

    // Detect latest 2 months
    const periods = Array.from(
      new Set(
        detailTable
          .filter((r) => r.year && r.month)
          .map((r) => `${r.year}-${String(r.month).padStart(2, "0")}`)
      )
    )
      .sort()
      .reverse(); // Descending [2025-02, 2025-01, ...]

    if (periods.length < 2) return null;

    const currentPeriod = periods[0];
    const prevPeriod = periods[1];

    const currentData = detailTable.filter(
      (r) => `${r.year}-${String(r.month).padStart(2, "0")}` === currentPeriod
    );
    const prevData = detailTable.filter(
      (r) => `${r.year}-${String(r.month).padStart(2, "0")}` === prevPeriod
    );

    // Calculate totals
    const calc = (rows: DetailTableRow[]) => {
      return rows.reduce(
        (acc, r) => ({
          screened: acc.screened + (r.normal + r.risk + r.sick),
          risk: acc.risk + r.risk,
        }),
        { screened: 0, risk: 0 }
      );
    };

    const current = calc(currentData);
    const prev = calc(prevData);

    const getPctChange = (curr: number, old: number) => {
      if (old === 0) return 0;
      return ((curr - old) / old) * 100;
    };

    return {
      periodLabel: `เทียบกับเดือนก่อนหน้า (${prevPeriod})`,
      screenedChange: getPctChange(current.screened, prev.screened),
      riskChange: getPctChange(current.risk, prev.risk),
    };
  }, [detailTable]);
}
