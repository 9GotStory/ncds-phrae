import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

import { Navigation } from "@/components/Navigation";
import { LoadingState } from "@/components/LoadingState";
import {
  googleSheetsApi,
  type DashboardDetailRow,
} from "@/services/googleSheetsApi";
import { getCombinedQueryState } from "@/lib/queryState";

// Components
import { useDetailFilters } from "./detail-components/useDetailFilters";
import { DetailActionToolbar } from "./detail-components/DetailActionToolbar";
import { StatCards } from "./detail-components/StatCards";
import { InsightsGrid } from "./detail-components/InsightsGrid";
import { DetailDataTable } from "./detail-components/DetailDataTable";

// Constants
const DETAIL_STALE_TIME = 0; // Realtime
const DETAIL_GC_TIME = 5 * 60 * 1000;
const RECORDS_PAGE_SIZE = 250;

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

  // 2. Main Data Query
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
          year: appliedFilters.year ? Number(appliedFilters.year) : undefined,
          month: appliedFilters.month
            ? Number(appliedFilters.month)
            : undefined,
        },
        { signal }
      ),
    staleTime: DETAIL_STALE_TIME,
    gcTime: DETAIL_GC_TIME,
  });

  const recordsQuery = useQuery({
    enabled: !!appliedFilters,
    queryKey: [
      "detail-records",
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
          year: appliedFilters.year ? Number(appliedFilters.year) : undefined,
          month: appliedFilters.month
            ? Number(appliedFilters.month)
            : undefined,
          page: recordsPage,
          limit: recordsLimit,
        },
        { signal }
      ),
    staleTime: DETAIL_STALE_TIME,
    gcTime: DETAIL_GC_TIME,
  });

  // 3. Logic & Transforms
  const data = detailQuery.data;
  const availability = data?.availability;
  const isError = detailQuery.isError;
  const summary = data?.summary;
  const adjustmentsSummary = data?.adjustments?.summary;

  const queryState = getCombinedQueryState([detailQuery, recordsQuery]);
  const showInitialLoading = queryState.isInitialLoading;
  const isLoading = queryState.isInitialLoading || queryState.isRefreshing;

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

  // --- Insight Logic (Server Side Preferred) ---
  // ---------------------------------------------------------
  // REVISED LOGIC: ALWAYS SHOW VILLAGE LEVEL (DEEPEST)
  // to answer "Which Village? Which Moo?" immediately.
  // ---------------------------------------------------------

  const topRiskAreas = useMemo(() => {
    // 1. Primary Source: Client-side Aggregation from Records
    // We prefer this because it allows us to show specific "Village/Moo" details
    // even when viewing the whole Province (which typically only returns District stats).
    if (data?.detailTable && data.detailTable.length > 0) {
      const map = new Map();

      data.detailTable.forEach((row) => {
        // Unique Key for Village: District + Subdistrict + Village + Moo
        // If any part is missing, fallback to whatever is available to avoid data loss
        // But target level is definitively Village/Moo.
        const key = `${row.district}-${row.subdistrict}-${row.village}-${
          row.moo || "0"
        }`;

        // Construct the detailed label ONE TIME
        /* format: หมู่ที่ 1 ร้องกวาง (ต.ร้องกวาง, อ.ร้องกวาง) */
        const mooPart = row.moo ? `หมู่ที่ ${row.moo} ` : "";
        const villagePart = row.village
          ? `${row.village}`
          : row.name || "ไม่ระบุชื่อ";
        const contextPart = `(ต.${row.subdistrict || "?"}, อ.${
          row.district || "?"
        })`;
        const fullLabel = `${mooPart}${villagePart} ${contextPart}`;

        const exist = map.get(key) || {
          name: row.village, // internal use
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
        exist.total += row.normal + row.risk + row.sick || 0;

        map.set(key, exist);
      });

      // Sort by Risk (High to Low)
      return Array.from(map.values()).sort((a: any, b: any) => b.risk - a.risk);
    }

    // 2. Fallback: comparison.areas (If detailTable is empty/paginated out)
    // This usually follows the drill-down level (District/Sub), but we try to label it clearly.
    if (data?.comparison?.areas && data.comparison.areas.length > 0) {
      return data.comparison.areas
        .map((area) => {
          // ... (keep existing fallback logic for safety, but detailTable should likely cover 99% cases)
          // Determine meaningful label context based on filter depth
          let contextLabel = area.name; // Default
          let subLabel = "";

          // ... (Simplified fallback context)
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
            risk: area.stats?.risk || area.risk || 0,
            total:
              (area.stats?.normal || area.normal || 0) +
              (area.stats?.risk || area.risk || 0) +
              (area.stats?.sick || area.sick || 0),
            normal: area.stats?.normal || area.normal || 0,
            sick: area.stats?.sick || area.sick || 0,
          };
        })
        .sort((a, b) => b.risk - a.risk);
    }

    // 3. Fallback: Districts
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
  // Needs 'referCount' from records or district stats.
  // DashboardDistrict has 'referCount'.
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

  // Top Referral Sources (Full List for Modal)
  const allReferralAreas = useMemo(() => {
    if (data?.detailTable && data.detailTable.length > 0) {
      // Aggregate referCount by village
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

      {/* 1. New Action Toolbar */}
      <DetailActionToolbar
        currentFilters={currentFilters}
        onFilterChange={handleFilterChange}
        onSearch={applyFilters}
        districtsMapping={districtsQuery.data}
        isLoading={isLoading}
        availability={availability}
      />

      <main className="container mx-auto px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {isError && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg text-center">
            ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง
          </div>
        )}

        {showInitialLoading ? (
          <LoadingState message="กำลังประมวลผลข้อมูล..." />
        ) : (
          <>
            {/* 2. Intervention Impact Stats */}
            <StatCards stats={detailStats} />

            {/* 3. Priority & Insights */}
            <InsightsGrid
              topRiskVillages={topRiskAreas} // Passing the unified list
              totalRefer={totalRefer}
              referLocationsCount={referLocationsCount}
              referralAreas={allReferralAreas} // Pass FULL list
              areaLevelLabel={
                appliedFilters.subdistrict
                  ? `หมู่บ้าน (ในตำบล${appliedFilters.subdistrict})`
                  : appliedFilters.district
                  ? `ตำบล (ในอำเภอ${appliedFilters.district})`
                  : "อำเภอ (ภาพรวมจังหวัด)"
              }
            />
            {/* 4. Detailed Data Table */}
            <DetailDataTable
              data={recordsQuery.data?.records || []}
              isLoading={recordsQuery.isFetching}
              page={recordsPage}
              setPage={setRecordsPage}
              total={recordsQuery.data?.total || 0}
              limit={recordsLimit}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default Detail;
