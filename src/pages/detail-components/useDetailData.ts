import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { googleSheetsApi } from "@/services/googleSheetsApi";

const DETAIL_STALE_TIME = 5 * 60 * 1000; // 5 Minutes
const DETAIL_GC_TIME = 10 * 60 * 1000; // 10 Minutes

interface UseDetailDataParams {
  appliedFilters: {
    targetGroup?: string;
    district?: string;
    subdistrict?: string;
    village?: string;
    year?: string;
    month?: string;
    moo?: string;
  };
  recordsPage: number;
  recordsLimit: number;
}

interface UseDetailDataResult {
  // Dashboard data (for stats, insights)
  detailQuery: ReturnType<typeof useQuery>;
  data: ReturnType<typeof googleSheetsApi.getDashboardData> | undefined;
  availability: ReturnType<typeof googleSheetsApi.getDashboardData>["availability"];
  summary: ReturnType<typeof googleSheetsApi.getDashboardData>["summary"];
  adjustmentsSummary: any;

  // Records data (for detailed table)
  recordsQuery: ReturnType<typeof useQuery>;
  records: any[];
  recordsTotal: number;
  recordsHasMore: boolean;

  // Loading states
  showInitialLoading: boolean;
  isLoading: boolean;
  isError: boolean;

  // Derived values
  effectiveYear: number;
}

export function useDetailData({
  appliedFilters,
  recordsPage,
  recordsLimit,
}: UseDetailDataParams): UseDetailDataResult {
  // 1. Dashboard Data Query (for stats, insights, availability)
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

  // 2. NcdRecords Query (for detailed table with disease breakdown)
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

  // 3. Extract data
  const data = detailQuery.data;
  const availability = data?.availability;
  const summary = data?.summary;
  const adjustmentsSummary = data?.adjustments?.summary;

  const showInitialLoading = detailQuery.isLoading;
  const isLoading = detailQuery.isLoading || detailQuery.isRefetching || recordsQuery.isLoading || recordsQuery.isRefetching;
  const isError = detailQuery.isError || recordsQuery.isError;

  // 4. Calculate effective year for display
  const effectiveYear = useMemo(() => {
    if (appliedFilters.year && appliedFilters.year !== "all") {
      return Number(appliedFilters.year);
    }
    if (availability?.years && availability.years.length > 0) {
      return Math.max(...availability.years);
    }
    return new Date().getFullYear() + 543;
  }, [appliedFilters.year, availability]);

  // 5. Records data
  const records = recordsQuery.data?.records || [];
  const recordsTotal = recordsQuery.data?.total || 0;
  const recordsHasMore = recordsQuery.data?.hasMore || false;

  return {
    detailQuery,
    data,
    availability,
    summary,
    adjustmentsSummary,
    recordsQuery,
    records,
    recordsTotal,
    recordsHasMore,
    showInitialLoading,
    isLoading,
    isError,
    effectiveYear,
  };
}
