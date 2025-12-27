import { useMemo } from "react";

export interface StatCard {
  key: string;
  title: string;
  value: number;
  baseline?: number;
  diff?: number;
  percentage?: number;
  variant: "default" | "success" | "warning" | "destructive";
}

interface UseDetailStatsParams {
  summary?: { normal?: number; risk?: number; sick?: number; total?: number };
  adjustmentsSummary?: {
    baseline?: { normal?: number; risk?: number; sick?: number; total?: number };
    adjusted?: { normal?: number; risk?: number; sick?: number; total?: number };
    diff?: { normal?: number; risk?: number; sick?: number; total?: number };
  };
}

interface UseDetailStatsResult {
  adjustedTotals: { normal: number; risk: number; sick: number; total: number };
  baselineTotals: { normal: number; risk: number; sick: number; total: number };
  diffTotals: { normal: number; risk: number; sick: number; total: number };
  detailStats: StatCard[];
}

const toValidNumber = (val: unknown): number =>
  typeof val === "number" && Number.isFinite(val) ? val : Number(val) || 0;

export function useDetailStats({
  summary,
  adjustmentsSummary,
}: UseDetailStatsParams): UseDetailStatsResult {
  // Calculate adjusted totals
  const adjustedTotals = useMemo(() => {
    if (adjustmentsSummary?.adjusted)
      return {
        normal: toValidNumber(adjustmentsSummary.adjusted.normal),
        risk: toValidNumber(adjustmentsSummary.adjusted.risk),
        sick: toValidNumber(adjustmentsSummary.adjusted.sick),
        total: toValidNumber(adjustmentsSummary.adjusted.total),
      };
    return {
      normal: toValidNumber(summary?.normal),
      risk: toValidNumber(summary?.risk),
      sick: toValidNumber(summary?.sick),
      total: toValidNumber(summary?.total),
    };
  }, [adjustmentsSummary, summary]);

  // Calculate baseline totals
  const baselineTotals = useMemo(() => {
    if (adjustmentsSummary?.baseline)
      return {
        normal: toValidNumber(adjustmentsSummary.baseline.normal),
        risk: toValidNumber(adjustmentsSummary.baseline.risk),
        sick: toValidNumber(adjustmentsSummary.baseline.sick),
        total: toValidNumber(adjustmentsSummary.baseline.total),
      };
    return adjustedTotals;
  }, [adjustmentsSummary, adjustedTotals]);

  // Calculate diff totals
  const diffTotals = useMemo(() => {
    if (adjustmentsSummary?.diff)
      return {
        normal: toValidNumber(adjustmentsSummary.diff.normal),
        risk: toValidNumber(adjustmentsSummary.diff.risk),
        sick: toValidNumber(adjustmentsSummary.diff.sick),
        total: toValidNumber(adjustmentsSummary.diff.total),
      };
    return { normal: 0, risk: 0, sick: 0, total: 0 };
  }, [adjustmentsSummary]);

  // Build stat cards
  const detailStats: StatCard[] = useMemo(() => {
    return [
      {
        key: "total",
        title: "กลุ่มเป้าหมายทั้งหมด",
        value: adjustedTotals.total,
        baseline: baselineTotals.total,
        diff: diffTotals.total,
        variant: "default",
      },
      {
        key: "normal",
        title: "กลุ่มปกติ",
        value: adjustedTotals.normal,
        percentage:
          adjustedTotals.total > 0
            ? (adjustedTotals.normal / adjustedTotals.total) * 100
            : 0,
        variant: "success",
      },
      {
        key: "risk",
        title: "กลุ่มเสี่ยง",
        value: adjustedTotals.risk,
        percentage:
          adjustedTotals.total > 0
            ? (adjustedTotals.risk / adjustedTotals.total) * 100
            : 0,
        variant: "warning",
      },
      {
        key: "sick",
        title: "ผู้ป่วย",
        value: adjustedTotals.sick,
        percentage:
          adjustedTotals.total > 0
            ? (adjustedTotals.sick / adjustedTotals.total) * 100
            : 0,
        variant: "destructive",
      },
    ];
  }, [adjustedTotals, baselineTotals, diffTotals]);

  return {
    adjustedTotals,
    baselineTotals,
    diffTotals,
    detailStats,
  };
}
