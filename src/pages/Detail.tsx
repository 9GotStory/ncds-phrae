import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

import { Navigation } from "@/components/Navigation";
import { LoadingState } from "@/components/LoadingState";
import {
  googleSheetsApi,
  type DashboardDetailRow,
  type NcdRecord,
} from "@/services/googleSheetsApi";

// Components
import { useDetailFilters } from "./detail-components/useDetailFilters";
import { DetailActionToolbar } from "./detail-components/DetailActionToolbar";
import { StatCards } from "./detail-components/StatCards";
import { InsightsGrid } from "./detail-components/InsightsGrid";
import { DetailDataTable } from "./detail-components/DetailDataTable";

// Constants
const DETAIL_STALE_TIME = 5 * 60 * 1000; // 5 Minutes
const DETAIL_GC_TIME = 10 * 60 * 1000; // 10 Minutes

const Detail = () => {
  // 1. Setup Filters Hook
  const {
    currentFilters,
    appliedFilters,
    handleFilterChange,
    applyFilters,
    districtsQuery,
  } = useDetailFilters();

  const [recordsPage, setRecordsPage] = useState(1);
  const recordsLimit = 50;

  // Reset page when filters change
  useEffect(() => {
    setRecordsPage(1);
  }, [appliedFilters]);

  // 2. Dashboard Data Query (for stats, insights, availability)
  const detailQuery = useQuery({
    queryKey: [
      "detail",
      appliedFilters.targetGroup || "all",
      appliedFilters.district || "all",
      appliedFilters.subdistrict || "all",
      appliedFilters.village || "all",
      appliedFilters.year || "all-year",
      appliedFilters.month || "all-month",
      appliedFilters.moo || "all-moo",
    ],
    queryFn: ({ signal }) =>
      googleSheetsApi.getDashboardData(
        {
          targetGroup: appliedFilters.targetGroup,
          district: appliedFilters.district || undefined,
          subdistrict: appliedFilters.subdistrict || undefined,
          village: appliedFilters.village || undefined,
          moo: appliedFilters.moo || undefined,
          year:
            appliedFilters.year && appliedFilters.year !== "all"
              ? Number(appliedFilters.year)
              : undefined,
          month:
            appliedFilters.month && appliedFilters.month !== "all"
              ? Number(appliedFilters.month)
              : undefined,
        },
        { signal }
      ),
    staleTime: DETAIL_STALE_TIME,
    gcTime: DETAIL_GC_TIME,
    placeholderData: (previousData) => previousData,
  });

  // 3. NcdRecords Query (for detailed table with disease breakdown)
  const recordsQuery = useQuery({
    queryKey: [
      "ncdRecords",
      appliedFilters.targetGroup || "all",
      appliedFilters.district || "all",
      appliedFilters.subdistrict || "all",
      appliedFilters.village || "all",
      appliedFilters.year || "all-year",
      appliedFilters.month || "all-month",
      appliedFilters.moo || "all-moo",
      recordsPage,
      recordsLimit,
    ],
    queryFn: ({ signal }) =>
      googleSheetsApi.getNcdRecords(
        {
          targetGroup: appliedFilters.targetGroup,
          district: appliedFilters.district || undefined,
          subdistrict: appliedFilters.subdistrict || undefined,
          village: appliedFilters.village || undefined,
          moo: appliedFilters.moo || undefined,
          year:
            appliedFilters.year && appliedFilters.year !== "all"
              ? Number(appliedFilters.year)
              : undefined,
          month:
            appliedFilters.month && appliedFilters.month !== "all"
              ? Number(appliedFilters.month)
              : undefined,
          page: recordsPage,
          limit: recordsLimit,
        },
        { signal }
      ),
    staleTime: DETAIL_STALE_TIME,
    gcTime: DETAIL_GC_TIME,
    placeholderData: (previousData) => previousData,
  });

  // 4. Logic & Transforms
  const data = detailQuery.data;
  const availability = data?.availability;
  const isError = detailQuery.isError || recordsQuery.isError;
  const summary = data?.summary;
  const adjustmentsSummary = data?.adjustments?.summary;

  const showInitialLoading = detailQuery.isLoading;
  const isLoading = detailQuery.isLoading || detailQuery.isRefetching || recordsQuery.isLoading || recordsQuery.isRefetching;

  // Calculate effective year for display
  const effectiveYear = useMemo(() => {
    if (appliedFilters.year && appliedFilters.year !== "all") {
      return Number(appliedFilters.year);
    }
    if (availability?.years && availability.years.length > 0) {
      return Math.max(...availability.years);
    }
    return new Date().getFullYear() + 543;
  }, [appliedFilters.year, availability]);

  // Use records from getNcdRecords API (has disease breakdown)
  const records = recordsQuery.data?.records || [];
  const recordsTotal = recordsQuery.data?.total || 0;
  const recordsHasMore = recordsQuery.data?.hasMore || false;

  // --- Helper Fns ---
  const toValidNumber = (val: unknown) =>
    typeof val === "number" && Number.isFinite(val) ? val : Number(val) || 0;

  // --- Calculations ---
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

  // --- Stats Construction ---
  const detailStats = useMemo(() => {
    return [
      {
        key: "total",
        title: "กลุ่มเป้าหมายทั้งหมด",
        value: adjustedTotals.total,
        baseline: baselineTotals.total,
        diff: diffTotals.total,
        variant: "default" as const,
      },
      {
        key: "normal",
        title: "กลุ่มปกติ",
        value: adjustedTotals.normal,
        percentage:
          adjustedTotals.total > 0
            ? (adjustedTotals.normal / adjustedTotals.total) * 100
            : 0,
        variant: "success" as const,
      },
      {
        key: "risk",
        title: "กลุ่มเสี่ยง",
        value: adjustedTotals.risk,
        percentage:
          adjustedTotals.total > 0
            ? (adjustedTotals.risk / adjustedTotals.total) * 100
            : 0,
        variant: "warning" as const,
      },
      {
        key: "sick",
        title: "ผู้ป่วย",
        value: adjustedTotals.sick,
        percentage:
          adjustedTotals.total > 0
            ? (adjustedTotals.sick / adjustedTotals.total) * 100
            : 0,
        variant: "destructive" as const,
      },
    ];
  }, [adjustedTotals, baselineTotals, diffTotals]);

  // --- Insight Logic ---
  const topRiskAreas = useMemo(() => {
    if (data?.detailTable && data.detailTable.length > 0) {
      const map = new Map();

      data.detailTable.forEach((row) => {
        const key = `${row.district}-${row.subdistrict}-${row.village}-${
          row.moo || "0"
        }`;

        const mooPart = row.moo ? `หมู่ที่ ${row.moo} ` : "";
        const villagePart = row.village ? `${row.village}` : "ไม่ระบุชื่อ";
        const contextPart = `(ต.${row.subdistrict || "?"}, อ.${
          row.district || "?"
        })`;
        const fullLabel = `${mooPart}${villagePart} ${contextPart}`;

        const exist = map.get(key) || {
          name: row.village,
          sub: "หมู่บ้าน",
          fullLabel: fullLabel,
          normal: 0,
          risk: 0,
          sick: 0,
          total: 0,
        };

        exist.risk += row.risk || 0;
        exist.normal += row.normal || 0;
        exist.sick += row.sick || 0;
        exist.total += (row.normal || 0) + (row.risk || 0) + (row.sick || 0);

        map.set(key, exist);
      });

      return Array.from(map.values()).sort((a: any, b: any) => b.risk - a.risk);
    }

    if (data?.comparison?.areas && data.comparison.areas.length > 0) {
      return data.comparison.areas
        .map((area) => {
          let contextLabel = area.name;
          let subLabel = "";

          if (appliedFilters.subdistrict) {
            subLabel = "หมู่บ้าน";
            contextLabel = `บ้าน${area.name} (ต.${appliedFilters.subdistrict})`;
          } else if (appliedFilters.district) {
            subLabel = "ตำบล";
            contextLabel = `ต.${area.name} (อ.${appliedFilters.district})`;
          } else {
            subLabel = "อำเภอ";
            contextLabel = `อ.${area.name}`;
          }

          return {
            name: area.name,
            sub: subLabel,
            fullLabel: contextLabel,
            risk: area.stats?.risk || 0,
            total:
              (area.stats?.normal || 0) +
              (area.stats?.risk || 0) +
              (area.stats?.sick || 0),
            normal: area.stats?.normal || 0,
            sick: area.stats?.sick || 0,
          };
        })
        .sort((a, b) => b.risk - a.risk);
    }

    if (
      data?.districts &&
      data.districts.length > 0 &&
      !appliedFilters.district
    ) {
      return data.districts
        .map((d) => ({
          name: d.name,
          sub: "อำเภอ",
          fullLabel: `อ.${d.name}`,
          risk: d.risk,
          total: d.normal + d.risk + d.sick,
          normal: d.normal,
          sick: d.sick,
        }))
        .sort((a, b) => b.risk - a.risk);
    }

    return [];
  }, [data, appliedFilters]);

  // Referrals
  const totalRefer = useMemo(() => {
    if (data?.districts) {
      return data.districts.reduce((sum, d) => sum + (d.referCount || 0), 0);
    }
    if (data?.detailTable) {
      return data.detailTable.reduce((sum, r) => sum + (r.referCount || 0), 0);
    }
    return 0;
  }, [data]);

  const referLocationsCount = useMemo(() => {
    if (data?.districts) {
      return data.districts.filter((d) => (d.referCount || 0) > 0).length;
    }
    if (data?.detailTable) {
      return data.detailTable.filter((r) => (r.referCount || 0) > 0).length;
    }
    return 0;
  }, [data]);

  const allReferralAreas = useMemo(() => {
    if (data?.detailTable && data.detailTable.length > 0) {
      const map = new Map();
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

      return Array.from(map.values()).sort(
        (a: any, b: any) => b.referCount - a.referCount
      );
    }
    return [];
  }, [data]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <Navigation />

      {/* 1. Action Toolbar */}
      <DetailActionToolbar
        currentFilters={currentFilters}
        onFilterChange={handleFilterChange}
        onSearch={applyFilters}
        districtsMapping={districtsQuery.data}
        isLoading={isLoading}
        availability={availability}
      />

      <main className="container mx-auto px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
        {/* Loading Overlay when refetching */}
        {detailQuery.isRefetching && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-20 flex items-center justify-center rounded-lg">
            <LoadingState
              message="กำลังโหลดข้อมูล..."
              className="bg-white/90 px-8 py-6 rounded-xl shadow-xl"
            />
          </div>
        )}

        {isError && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg text-center flex flex-col items-center">
            <span className="font-semibold">ไม่สามารถโหลดข้อมูลได้</span>
            <span className="text-sm mt-1 opacity-80">
              {detailQuery.error?.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล"}
            </span>
          </div>
        )}

        {showInitialLoading ? (
          <LoadingState message="กำลังประมวลผลข้อมูล..." />
        ) : (
          <>
            {/* 2. Stats */}
            <StatCards stats={detailStats} />

            {/* 3. Priority & Insights */}
            <InsightsGrid
              topRiskVillages={topRiskAreas}
              totalRefer={totalRefer}
              referLocationsCount={referLocationsCount}
              referralAreas={allReferralAreas}
              areaLevelLabel={
                appliedFilters.subdistrict
                  ? `หมู่บ้าน (ในตำบล${appliedFilters.subdistrict})`
                  : appliedFilters.district
                  ? `ตำบล (ในอำเภอ${appliedFilters.district})`
                  : "อำเภอ (ภาพรวมจังหวัด)"
              }
            />

            {/* 4. Detailed Data Table - Using getNcdRecords API with disease breakdown */}
            <DetailDataTable
              data={records}
              isLoading={isLoading}
              page={recordsPage}
              setPage={setRecordsPage}
              total={recordsTotal}
              limit={recordsLimit}
              hasMore={recordsHasMore}
            />

            {/* Debug info */}
            <div className="text-center text-[10px] text-slate-300 font-mono mt-4">
              Debug: Year={effectiveYear} | District=
              {appliedFilters.district || "All"} | DetailTable=
              {data?.detailTable?.length ?? 0} | Records={records.length}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Detail;
