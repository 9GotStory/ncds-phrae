import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { googleSheetsApi, type DashboardStatsCard } from "@/services/googleSheetsApi";

export interface DashboardDistrict {
  id: string;
  name: string;
  normal: number;
  risk: number;
  sick: number;
  referCount?: number;
}

interface UseOverviewDataResult {
  // Query state
  dashboardQuery: ReturnType<typeof useQuery>;
  data: ReturnType<typeof googleSheetsApi.getDashboardData> | undefined;

  // Extracted data
  stats: DashboardStatsCard[];
  summary: { normal?: number; risk?: number; sick?: number; total?: number } | undefined;
  totalPop: number;
  districts: DashboardDistrict[];
  detailTable: Array<{
    district: string;
    subdistrict: string;
    village: string;
    moo?: string;
    normal: number;
    risk: number;
    sick: number;
    year?: number;
    month?: number;
  }>;

  // Loading states
  isInitialLoading: boolean;
  isRefreshing: boolean;
  isError: boolean;
}

export function useOverviewData(): UseOverviewDataResult {
  // Fetch Main Data
  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "overview", "general"],
    queryFn: ({ signal }) =>
      googleSheetsApi.getDashboardData({
        targetGroup: "general",
      }),
  });

  const data = dashboardQuery.data;
  const isError = dashboardQuery.isError;

  // Prepare stats
  const stats: DashboardStatsCard[] = useMemo(() => {
    if (data?.stats && data.stats.length > 0) return data.stats;
    return [];
  }, [data]);

  const summary = data?.summary;
  const totalPop = summary?.total || 0;

  // Prepare districts
  const districts = useMemo(
    () => (Array.isArray(data?.districts) ? data.districts : []),
    [data?.districts]
  );

  const detailTable = data?.detailTable || [];

  // Loading states
  const isInitialLoading = dashboardQuery.isLoading;
  const isRefreshing = dashboardQuery.isRefetching;

  return {
    dashboardQuery,
    data,
    stats,
    summary,
    totalPop,
    districts,
    detailTable,
    isInitialLoading,
    isRefreshing,
    isError,
  };
}
