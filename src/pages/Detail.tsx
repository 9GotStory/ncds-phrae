import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ActivitySquare,
  Layers,
  MapPin,
  Search,
  Target,
  Users,
  UserCheck,
  AlertTriangle,
  Award,
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { Navigation } from "@/components/Navigation";
import { DonutChart } from "@/components/charts/DonutChart";
import { LineChart } from "@/components/charts/LineChart";
import { LoadingState } from "@/components/LoadingState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/useAuth";
import {
  googleSheetsApi,
  type DashboardDetailRow,
  type NcdAdjustmentEntry,
  type NcdMetrics,
} from "@/services/googleSheetsApi";
import { getCombinedQueryState } from "@/lib/queryState";
import { StatsCard } from "@/components/StatsCard";
import { Separator } from "@/components/ui/separator";

interface DetailFilters {
  targetGroup: string;
  district: string;
  subdistrict: string;
  village: string;
  moo: string;
  year: string;
  month: string;
}

const targetGroupOptions = [
  { value: "general", label: "บุคคลทั่วไป" },
  { value: "monk", label: "พระสงฆ์" },
];

const initialFilters: DetailFilters = {
  targetGroup: "general",
  district: "",
  subdistrict: "",
  village: "",
  moo: "",
  year: "",
  month: "",
};

const ALL_DISTRICT_VALUE = "__all_district__";
const ALL_SUBDISTRICT_VALUE = "__all_subdistrict__";
const ALL_VILLAGE_VALUE = "__all_village__";
const ALL_YEAR_VALUE = "__all_year__";
const ALL_MONTH_VALUE = "__all_month__";
const ALL_MOO_VALUE = "__all_moo__";
const THAI_MONTH_LABELS = [
  "",
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];
const DETAIL_STALE_TIME = 60 * 1000;
const DETAIL_GC_TIME = 5 * 60 * 1000;
const RECORDS_PAGE_SIZE = 250;
const MAX_BACKGROUND_PAGES = 50;

const Detail = () => {
  const { user } = useAuth();
  const [currentFilters, setCurrentFilters] =
    useState<DetailFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<DetailFilters>(initialFilters);
  const [recordsPage, setRecordsPage] = useState(1);
  const recordsLimit = 50;
  const [searchParams] = useSearchParams();
  const lastAppliedQueryRef = useRef<string | null>(null);
  const [factorView, setFactorView] = useState<"absolute" | "percentage">(
    "absolute"
  );
  const [locationSearchTerm, setLocationSearchTerm] = useState("");
  const [showReferMetrics, setShowReferMetrics] = useState(true);

  useEffect(() => {
    if (user?.role === "officer" && user.district) {
      setCurrentFilters((prev) =>
        prev.district ? prev : { ...prev, district: user.district }
      );
    }
  }, [user?.district, user?.role]);

  useEffect(() => {
    const queryString = searchParams.toString();
    if (lastAppliedQueryRef.current === queryString) {
      return;
    }

    const targetGroupParam = searchParams.get("targetGroup");
    const districtParam = searchParams.get("district");
    const subdistrictParam = searchParams.get("subdistrict");
    const villageParam = searchParams.get("village");
    const mooParam = searchParams.get("moo");
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    if (
      !targetGroupParam &&
      !districtParam &&
      !subdistrictParam &&
      !villageParam &&
      !mooParam &&
      !yearParam &&
      !monthParam
    ) {
      lastAppliedQueryRef.current = queryString;
      return;
    }

    const normalizedTargetGroup = targetGroupOptions.some(
      (option) => option.value === targetGroupParam
    )
      ? (targetGroupParam as DetailFilters["targetGroup"])
      : initialFilters.targetGroup;

    const nextFilters: DetailFilters = {
      ...initialFilters,
      targetGroup: normalizedTargetGroup,
      district: districtParam ?? "",
      subdistrict: subdistrictParam ?? "",
      village: villageParam ?? "",
      moo: mooParam ?? "",
      year: yearParam ?? "",
      month: monthParam ?? "",
    };

    setCurrentFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setRecordsPage(1);
    lastAppliedQueryRef.current = queryString;
  }, [searchParams]);

  const districtsQuery = useQuery({
    queryKey: ["districts"],
    queryFn: () => googleSheetsApi.getDistricts(),
  });

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

  const data = detailQuery.data;
  const availability = data?.availability;
  const isError = detailQuery.isError;

  const summary = data?.summary;
  const adjustmentsSummary = data?.adjustments?.summary;
  const toValidNumber = (value: unknown): number => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };
  const clampNonNegative = (value: number): number => (value < 0 ? 0 : value);
  const fallbackAdjustedTotals = useMemo(() => {
    if (adjustmentsSummary?.adjusted) {
      return {
        normal: toValidNumber(adjustmentsSummary.adjusted.normal),
        risk: toValidNumber(adjustmentsSummary.adjusted.risk),
        sick: toValidNumber(adjustmentsSummary.adjusted.sick),
        total: toValidNumber(adjustmentsSummary.adjusted.total),
      };
    }
    return {
      normal: toValidNumber(summary?.normal),
      risk: toValidNumber(summary?.risk),
      sick: toValidNumber(summary?.sick),
      total: toValidNumber(summary?.total),
    };
  }, [
    adjustmentsSummary?.adjusted,
    summary?.normal,
    summary?.risk,
    summary?.sick,
    summary?.total,
  ]);

  const fallbackBaselineTotals = useMemo(() => {
    if (adjustmentsSummary?.baseline) {
      return {
        normal: toValidNumber(adjustmentsSummary.baseline.normal),
        risk: toValidNumber(adjustmentsSummary.baseline.risk),
        sick: toValidNumber(adjustmentsSummary.baseline.sick),
        total: toValidNumber(adjustmentsSummary.baseline.total),
      };
    }
    return {
      normal: toValidNumber(summary?.normal),
      risk: toValidNumber(summary?.risk),
      sick: toValidNumber(summary?.sick),
      total: toValidNumber(summary?.total),
    };
  }, [
    adjustmentsSummary?.baseline,
    summary?.normal,
    summary?.risk,
    summary?.sick,
    summary?.total,
  ]);

  const fallbackDiffTotals = useMemo(() => {
    if (adjustmentsSummary?.diff) {
      return {
        normal: toValidNumber(adjustmentsSummary.diff.normal),
        risk: toValidNumber(adjustmentsSummary.diff.risk),
        sick: toValidNumber(adjustmentsSummary.diff.sick),
        total: toValidNumber(adjustmentsSummary.diff.total),
      };
    }
    return {
      normal: fallbackAdjustedTotals.normal - fallbackBaselineTotals.normal,
      risk: fallbackAdjustedTotals.risk - fallbackBaselineTotals.risk,
      sick: fallbackAdjustedTotals.sick - fallbackBaselineTotals.sick,
      total: fallbackAdjustedTotals.total - fallbackBaselineTotals.total,
    };
  }, [
    adjustmentsSummary?.diff,
    fallbackAdjustedTotals,
    fallbackBaselineTotals,
  ]);

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

  useEffect(() => {
    setRecordsPage(1);
  }, [appliedFilters]);

  const queryState = getCombinedQueryState([detailQuery, recordsQuery]);
  const showInitialLoading = queryState.isInitialLoading;
  const showRefreshing = queryState.isRefreshing;
  const isSearching = queryState.isInitialLoading || queryState.isRefreshing;
  const isAvailabilityReady = Boolean(availability) || detailQuery.isError;
  const isSearchDisabled = !isAvailabilityReady || isSearching;
  const activeFilters = appliedFilters;
  const selectedMooLabel = appliedFilters.moo
    ? `หมู่ที่ ${appliedFilters.moo}`
    : "";

  useEffect(() => {
    if (!availability) {
      return;
    }

    setCurrentFilters((prev) => {
      const next = { ...prev };
      let changed = false;

      const districts = availability.districts ?? [];
      if (!next.district && districts.length === 1) {
        next.district = districts[0];
        changed = true;
      }

      if (
        next.district &&
        districts.length > 0 &&
        !districts.includes(next.district)
      ) {
        next.district = "";
        next.subdistrict = "";
        next.village = "";
        next.moo = "";
        changed = true;
      }

      const availableYears = (availability.years ?? []).map((year) =>
        String(year)
      );
      if (next.year) {
        if (!availableYears.includes(next.year)) {
          next.year = "";
          next.month = "";
          changed = true;
        }
      } else if (availableYears.length === 1) {
        next.year = availableYears[0];
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [availability]);

  const subdistrictOptions = useMemo(() => {
    if (!currentFilters.district || !availability?.subdistrictsByDistrict) {
      return [];
    }
    return availability.subdistrictsByDistrict[currentFilters.district] ?? [];
  }, [availability?.subdistrictsByDistrict, currentFilters.district]);

  const villageOptions = useMemo(() => {
    if (
      !currentFilters.district ||
      !currentFilters.subdistrict ||
      !availability?.villagesBySubdistrict
    ) {
      return [];
    }
    const key = `${currentFilters.district}::${currentFilters.subdistrict}`;
    return availability.villagesBySubdistrict[key] ?? [];
  }, [
    availability?.villagesBySubdistrict,
    currentFilters.district,
    currentFilters.subdistrict,
  ]);

  const mooOptions = useMemo(() => {
    const mapping = districtsQuery.data;
    if (!mapping || !currentFilters.district || !currentFilters.subdistrict) {
      return [];
    }

    const districtInfo = mapping[currentFilters.district];
    if (!districtInfo) {
      return [];
    }

    const subdistrictInfo = districtInfo[currentFilters.subdistrict];
    if (!subdistrictInfo) {
      return [];
    }

    const moos = subdistrictInfo.moos ?? [];
    if (!moos.length) {
      return [];
    }

    if (currentFilters.village) {
      const normalizedVillage = currentFilters.village.toLowerCase();
      const filtered = moos.filter((moo) =>
        normalizedVillage.includes(moo.toLowerCase())
      );
      if (filtered.length) {
        return filtered;
      }
    }

    return moos;
  }, [
    districtsQuery.data,
    currentFilters.district,
    currentFilters.subdistrict,
    currentFilters.village,
  ]);

  const monthsByYear = useMemo(() => {
    const mapping: Record<string, { value: string; label: string }[]> = {};
    const periods = availability?.periods ?? [];

    periods.forEach((period) => {
      const key = period.key ?? "";
      const [yearPart, monthPart] = key.split("-");
      if (!yearPart || !monthPart) {
        return;
      }
      const monthNumber = Number(monthPart);
      if (!Number.isFinite(monthNumber)) {
        return;
      }
      const monthValue = String(monthNumber);
      const monthLabel =
        THAI_MONTH_LABELS[monthNumber] ?? `เดือนที่ ${monthNumber}`;
      if (!mapping[yearPart]) {
        mapping[yearPart] = [];
      }
      if (!mapping[yearPart].some((item) => item.value === monthValue)) {
        mapping[yearPart].push({ value: monthValue, label: monthLabel });
      }
    });

    Object.keys(mapping).forEach((yearKey) => {
      mapping[yearKey].sort((a, b) => Number(b.value) - Number(a.value));
    });

    return mapping;
  }, [availability?.periods]);

  const monthOptions = useMemo(() => {
    if (!currentFilters.year) {
      return [];
    }
    return monthsByYear[currentFilters.year] ?? [];
  }, [currentFilters.year, monthsByYear]);

  useEffect(() => {
    setCurrentFilters((prev) => {
      const next = { ...prev };
      let changed = false;

      if (!prev.year) {
        if (prev.month) {
          next.month = "";
          changed = true;
        }
        return changed ? next : prev;
      }

      if (!monthOptions.length) {
        if (prev.month) {
          next.month = "";
          changed = true;
        }
        return changed ? next : prev;
      }

      if (
        prev.month &&
        !monthOptions.some((option) => option.value === prev.month)
      ) {
        next.month = "";
        changed = true;
      } else if (!prev.month && monthOptions.length === 1) {
        next.month = monthOptions[0].value;
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [monthOptions]);

  useEffect(() => {
    setCurrentFilters((prev) => {
      const next = { ...prev };
      let changed = false;

      if (!subdistrictOptions.length) {
        if (prev.subdistrict || prev.village) {
          next.subdistrict = "";
          next.village = "";
          next.moo = "";
          changed = true;
        }
        return changed ? next : prev;
      }

      if (prev.subdistrict && !subdistrictOptions.includes(prev.subdistrict)) {
        next.subdistrict = "";
        next.village = "";
        next.moo = "";
        changed = true;
      } else if (!prev.subdistrict && subdistrictOptions.length === 1) {
        next.subdistrict = subdistrictOptions[0];
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [subdistrictOptions]);

  useEffect(() => {
    setCurrentFilters((prev) => {
      const next = { ...prev };
      let changed = false;

      if (!prev.subdistrict) {
        if (prev.village) {
          next.village = "";
          next.moo = "";
          changed = true;
        }
        return changed ? next : prev;
      }

      if (!villageOptions.length) {
        if (prev.village) {
          next.village = "";
          next.moo = "";
          changed = true;
        }
        return changed ? next : prev;
      }

      if (prev.village && !villageOptions.includes(prev.village)) {
        next.village = "";
        next.moo = "";
        changed = true;
      } else if (!prev.village && villageOptions.length === 1) {
        next.village = villageOptions[0];
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [villageOptions]);

  useEffect(() => {
    setCurrentFilters((prev) => {
      const next = { ...prev };
      let changed = false;

      if (!mooOptions.length) {
        if (prev.moo) {
          next.moo = "";
          changed = true;
        }
        return changed ? next : prev;
      }

      if (prev.moo && !mooOptions.includes(prev.moo)) {
        next.moo = "";
        changed = true;
      } else if (!prev.moo && mooOptions.length === 1) {
        next.moo = mooOptions[0];
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [mooOptions]);

  const recordsPagination = recordsQuery.data;
  const getPeriodLabel = (
    yearValue: unknown,
    monthValue: unknown
  ): string | undefined => {
    const yearNumber = toValidNumber(yearValue);
    if (!yearNumber) {
      return undefined;
    }
    const monthNumber = toValidNumber(monthValue);
    if (!monthNumber) {
      return String(yearNumber);
    }
    const monthIndex = Math.max(1, Math.min(12, Math.trunc(monthNumber)));
    const monthName = THAI_MONTH_LABELS[monthIndex] ?? `เดือนที่ ${monthIndex}`;
    return `${monthName} ${yearNumber}`;
  };
  const categorySummary = useMemo(() => {
    if (!data?.categories?.length) {
      return {
        overview: null as {
          total: number;
          normal: number;
          risk: number;
          sick: number;
        } | null,
        factors: [] as Array<{
          key?: string;
          name: string;
          total: number;
          normal: number;
          risk: number;
          sick: number;
        }>,
      };
    }

    const normalized = data.categories.map((item) => ({
      ...item,
      total: toValidNumber(item.total),
      normal: toValidNumber(item.normal),
      risk: toValidNumber(item.risk),
      sick: toValidNumber(item.sick),
    }));

    const overviewItem =
      normalized.find((item) => item.key === "Overview") ?? null;
    const factorItems = normalized.filter((item) => item.key !== "Overview");

    return {
      overview: overviewItem
        ? {
            total: overviewItem.total,
            normal: overviewItem.normal,
            risk: overviewItem.risk,
            sick: overviewItem.sick,
          }
        : null,
      factors: factorItems,
    };
  }, [data?.categories]);

  type DetailRowWithMetrics = DashboardDetailRow & {
    metrics?: {
      Overview?: {
        normal?: number;
        risk?: number;
        sick?: number;
      };
      overview?: {
        normal?: number;
        risk?: number;
        sick?: number;
      };
      Total?: {
        normal?: number;
        risk?: number;
        sick?: number;
      };
      total?: {
        normal?: number;
        risk?: number;
        sick?: number;
      };
    };
    baselineMetrics?: NcdMetrics;
    adjustedMetrics?: NcdMetrics;
    adjustments?: NcdMetrics;
    baselineOverviewTotal?: number;
    adjustedOverviewTotal?: number;
    adjustmentEntries?: NcdAdjustmentEntry[];
  };

  const rawDetailRecords = useMemo(() => {
    const paginatedRecords = recordsPagination?.records;
    if (Array.isArray(paginatedRecords) && paginatedRecords.length > 0) {
      return paginatedRecords;
    }

    const fallbackRecords = Array.isArray(data?.detailTable)
      ? data.detailTable
      : [];
    if (!fallbackRecords.length) {
      return [];
    }

    if (!appliedFilters) {
      return fallbackRecords;
    }

    return fallbackRecords.filter((row) => {
      const district = typeof row.district === "string" ? row.district : "";
      const subdistrict =
        typeof row.subdistrict === "string" ? row.subdistrict : "";
      const village = typeof row.village === "string" ? row.village : "";
      const moo = typeof row.moo === "string" ? row.moo : "";
      const year =
        row.year !== undefined && row.year !== null ? String(row.year) : "";
      const month =
        row.month !== undefined && row.month !== null ? String(row.month) : "";

      const normalize = (value: string) => value.trim().toLowerCase();

      if (
        appliedFilters.district &&
        normalize(district) !== normalize(appliedFilters.district)
      ) {
        return false;
      }
      if (
        appliedFilters.subdistrict &&
        normalize(subdistrict) !== normalize(appliedFilters.subdistrict)
      ) {
        return false;
      }
      if (
        appliedFilters.village &&
        normalize(village) !== normalize(appliedFilters.village)
      ) {
        return false;
      }
      if (
        appliedFilters.moo &&
        normalize(moo) !== normalize(appliedFilters.moo)
      ) {
        return false;
      }
      if (appliedFilters.year && year !== appliedFilters.year) {
        return false;
      }
      if (appliedFilters.month && month !== appliedFilters.month) {
        return false;
      }

      return true;
    });
  }, [appliedFilters, data?.detailTable, recordsPagination?.records]);

  const detailRows = rawDetailRecords.map((row) => {
    const typedRow = row as DetailRowWithMetrics;
    const metrics = typedRow.metrics ?? {};
    const overviewMetrics =
      metrics.Overview ?? metrics.overview ?? metrics.Total ?? metrics.total;

    const baselineMetrics =
      typedRow.baselineMetrics ?? (metrics as NcdMetrics | undefined);
    const adjustedMetrics =
      typedRow.adjustedMetrics ?? (metrics as NcdMetrics | undefined);
    const adjustmentsMetrics = typedRow.adjustments ?? undefined;

    const baselineOverviewMetrics =
      baselineMetrics?.Overview ?? baselineMetrics?.overview ?? overviewMetrics;
    const adjustedOverviewMetrics =
      adjustedMetrics?.Overview ?? adjustedMetrics?.overview ?? overviewMetrics;
    const adjustmentsOverviewMetrics =
      adjustmentsMetrics?.Overview ??
      adjustmentsMetrics?.overview ??
      adjustmentsMetrics?.Total ??
      adjustmentsMetrics?.total;

    const fallbackNormal = toValidNumber(
      typedRow.normal ?? overviewMetrics?.normal
    );
    const fallbackRisk = toValidNumber(typedRow.risk ?? overviewMetrics?.risk);
    const fallbackSick = toValidNumber(typedRow.sick ?? overviewMetrics?.sick);

    const baselineNormalRaw = toValidNumber(
      baselineOverviewMetrics?.normal ?? fallbackNormal
    );
    const baselineRiskRaw = toValidNumber(
      baselineOverviewMetrics?.risk ?? fallbackRisk
    );
    const baselineSickRaw = toValidNumber(
      baselineOverviewMetrics?.sick ?? fallbackSick
    );

    const adjustedNormalRaw = toValidNumber(
      adjustedOverviewMetrics?.normal ?? fallbackNormal
    );
    const adjustedRiskRaw = toValidNumber(
      adjustedOverviewMetrics?.risk ?? fallbackRisk
    );
    const adjustedSickRaw = toValidNumber(
      adjustedOverviewMetrics?.sick ?? fallbackSick
    );

    const diffNormalRaw =
      adjustmentsOverviewMetrics &&
      adjustmentsOverviewMetrics.normal !== undefined
        ? toValidNumber(adjustmentsOverviewMetrics.normal)
        : adjustedNormalRaw - baselineNormalRaw;
    const diffRiskRaw =
      adjustmentsOverviewMetrics &&
      adjustmentsOverviewMetrics.risk !== undefined
        ? toValidNumber(adjustmentsOverviewMetrics.risk)
        : adjustedRiskRaw - baselineRiskRaw;
    const diffSickRaw =
      adjustmentsOverviewMetrics &&
      adjustmentsOverviewMetrics.sick !== undefined
        ? toValidNumber(adjustmentsOverviewMetrics.sick)
        : adjustedSickRaw - baselineSickRaw;

    const baselineNormal = clampNonNegative(baselineNormalRaw);
    const baselineRisk = clampNonNegative(baselineRiskRaw);
    const baselineSick = clampNonNegative(baselineSickRaw);

    const adjustedNormal = clampNonNegative(baselineNormal + diffNormalRaw);
    const adjustedRisk = clampNonNegative(baselineRisk + diffRiskRaw);
    const adjustedSick = clampNonNegative(baselineSick + diffSickRaw);

    const diffNormal = adjustedNormal - baselineNormal;
    const diffRisk = adjustedRisk - baselineRisk;
    const diffSick = adjustedSick - baselineSick;

    const baselineTotal =
      typeof typedRow.baselineOverviewTotal === "number"
        ? clampNonNegative(toValidNumber(typedRow.baselineOverviewTotal))
        : clampNonNegative(baselineNormal + baselineRisk + baselineSick);
    const adjustedTotal =
      typeof typedRow.adjustedOverviewTotal === "number"
        ? clampNonNegative(toValidNumber(typedRow.adjustedOverviewTotal))
        : clampNonNegative(adjustedNormal + adjustedRisk + adjustedSick);
    const diffTotal = adjustedTotal - baselineTotal;

    const referCount = toValidNumber(typedRow.referCount);
    const period =
      (typeof typedRow.period === "string" && typedRow.period
        ? typedRow.period
        : typeof (typedRow as { periodLabel?: string }).periodLabel ===
            "string" && (typedRow as { periodLabel?: string }).periodLabel
        ? (typedRow as { periodLabel?: string }).periodLabel
        : getPeriodLabel(typedRow.year, typedRow.month)) ?? undefined;
    const hasExplicitTotal =
      typedRow.total !== undefined &&
      typedRow.total !== null &&
      typedRow.total !== "";
    const total = hasExplicitTotal
      ? clampNonNegative(toValidNumber(typedRow.total))
      : adjustedTotal;

    const adjustmentEntries = Array.isArray(typedRow.adjustmentEntries)
      ? typedRow.adjustmentEntries
      : [];

    return {
      ...typedRow,
      normal: adjustedNormal,
      risk: adjustedRisk,
      sick: adjustedSick,
      total,
      referCount,
      period,
      baselineOverview: {
        normal: baselineNormal,
        risk: baselineRisk,
        sick: baselineSick,
        total: baselineTotal,
      },
      adjustedOverview: {
        normal: adjustedNormal,
        risk: adjustedRisk,
        sick: adjustedSick,
        total: adjustedTotal,
      },
      diffOverview: {
        normal: diffNormal,
        risk: diffRisk,
        sick: diffSick,
        total: diffTotal,
      },
      adjustmentEntries,
    };
  });

  const detailAdjustmentSummary = useMemo(() => {
    if (!detailRows.length) {
      return null;
    }

    return detailRows.reduce(
      (acc, row) => {
        const baseline = row.baselineOverview;
        const adjusted = row.adjustedOverview;
        const diff = row.diffOverview;

        acc.baseline.normal += baseline.normal;
        acc.baseline.risk += baseline.risk;
        acc.baseline.sick += baseline.sick;
        acc.baseline.total += baseline.total;

        acc.adjusted.normal += adjusted.normal;
        acc.adjusted.risk += adjusted.risk;
        acc.adjusted.sick += adjusted.sick;
        acc.adjusted.total += adjusted.total;

        acc.diff.normal += diff.normal;
        acc.diff.risk += diff.risk;
        acc.diff.sick += diff.sick;
        acc.diff.total += diff.total;

        return acc;
      },
      {
        baseline: { normal: 0, risk: 0, sick: 0, total: 0 },
        adjusted: { normal: 0, risk: 0, sick: 0, total: 0 },
        diff: { normal: 0, risk: 0, sick: 0, total: 0 },
      }
    );
  }, [detailRows]);

  const adjustedTotals =
    detailAdjustmentSummary?.adjusted ?? fallbackAdjustedTotals;
  const baselineTotals =
    detailAdjustmentSummary?.baseline ?? fallbackBaselineTotals;
  const diffTotals = detailAdjustmentSummary?.diff ?? fallbackDiffTotals;

  const overviewTotals = useMemo(() => {
    if (detailAdjustmentSummary) {
      return detailAdjustmentSummary.adjusted;
    }

    if (categorySummary.overview) {
      return categorySummary.overview;
    }

    return fallbackAdjustedTotals;
  }, [
    categorySummary.overview,
    detailAdjustmentSummary,
    fallbackAdjustedTotals,
  ]);

  const groupedData = useMemo(() => {
    const periods: Record<
      string,
      Record<string, Record<string, typeof detailRows>>
    > = {};

    detailRows.forEach((row) => {
      const periodKey = row.period || "ไม่ระบุช่วงเวลา";
      const districtKey = row.district || "ไม่ระบุอำเภอ";
      const subdistrictKey = row.subdistrict || "ไม่ระบุตำบล";

      if (!periods[periodKey]) {
        periods[periodKey] = {};
      }
      if (!periods[periodKey][districtKey]) {
        periods[periodKey][districtKey] = {};
      }
      if (!periods[periodKey][districtKey][subdistrictKey]) {
        periods[periodKey][districtKey][subdistrictKey] = [];
      }
      periods[periodKey][districtKey][subdistrictKey].push(row);
    });

    return periods;
  }, [detailRows]);
  const filteredGroupedData = useMemo(() => {
    const term = locationSearchTerm.trim().toLowerCase();
    if (!term) {
      return groupedData;
    }

    const normalizeText = (value: unknown) => {
      if (typeof value === "string") {
        return value.toLowerCase();
      }
      if (typeof value === "number") {
        return value.toString().toLowerCase();
      }
      return "";
    };

    const result: Record<
      string,
      Record<string, Record<string, typeof detailRows>>
    > = {};

    Object.entries(groupedData).forEach(([periodKey, districts]) => {
      const periodMatch = normalizeText(periodKey).includes(term);
      const nextDistricts: Record<
        string,
        Record<string, typeof detailRows>
      > = {};

      Object.entries(districts).forEach(([districtKey, subdistricts]) => {
        const districtMatch =
          periodMatch || normalizeText(districtKey).includes(term);
        const nextSubdistricts: Record<string, typeof detailRows> = {};

        Object.entries(subdistricts).forEach(([subdistrictKey, villages]) => {
          const subdistrictMatch =
            districtMatch || normalizeText(subdistrictKey).includes(term);

          const filteredVillages = subdistrictMatch
            ? villages
            : villages.filter((village) => {
                const fields = [
                  normalizeText(village.village),
                  normalizeText(village.moo),
                  normalizeText(village.subdistrict),
                  normalizeText(village.district),
                  normalizeText(village.period),
                ];
                return fields.some((field) => field.includes(term));
              });

          if (filteredVillages.length) {
            nextSubdistricts[subdistrictKey] = filteredVillages;
          }
        });

        if (Object.keys(nextSubdistricts).length) {
          nextDistricts[districtKey] = nextSubdistricts;
        }
      });

      if (Object.keys(nextDistricts).length) {
        result[periodKey] = nextDistricts;
      }
    });

    return result;
  }, [groupedData, locationSearchTerm]);
  const hasAnyData = Object.keys(groupedData).length > 0;
  const hasFilteredResults = Object.keys(filteredGroupedData).length > 0;
  const isFilteringLocations = locationSearchTerm.trim().length > 0;
  const totalPeople = adjustedTotals.total;
  const totalRefer = useMemo(
    () => detailRows.reduce((acc, row) => acc + (row.referCount ?? 0), 0),
    [detailRows]
  );

  const locationAggregates = useMemo(() => {
    const map = new Map<
      string,
      {
        district: string;
        subdistrict: string;
        village: string;
        normal: number;
        risk: number;
        sick: number;
        total: number;
        refer: number;
      }
    >();

    detailRows.forEach((row) => {
      const key = `${row.district || ""}|${row.subdistrict || ""}|${
        row.village || ""
      }`;
      const existing = map.get(key) ?? {
        district: row.district || "ไม่ระบุ",
        subdistrict: row.subdistrict || "ไม่ระบุ",
        village: row.village || "",
        normal: 0,
        risk: 0,
        sick: 0,
        total: 0,
        refer: 0,
      };

      existing.normal += row.normal;
      existing.risk += row.risk;
      existing.sick += row.sick;
      existing.total += row.total;
      existing.refer += row.referCount ?? 0;

      map.set(key, existing);
    });

    return Array.from(map.values());
  }, [detailRows]);

  const districtSummaries = useMemo(() => {
    const map = new Map<
      string,
      { name: string; risk: number; sick: number; total: number }
    >();

    detailRows.forEach((row) => {
      const name = row.district || "ไม่ระบุอำเภอ";
      const summary = map.get(name) ?? { name, risk: 0, sick: 0, total: 0 };
      summary.risk += row.risk;
      summary.sick += row.sick;
      summary.total += row.total;
      map.set(name, summary);
    });

    return Array.from(map.values());
  }, [detailRows]);

  const topRiskDistrict = useMemo(() => {
    if (!districtSummaries.length) {
      return undefined;
    }

    return districtSummaries.reduce<{ name: string; risk: number } | undefined>(
      (acc, item) => {
        if (!acc || item.risk > acc.risk) {
          return { name: item.name, risk: item.risk };
        }
        return acc;
      },
      undefined
    );
  }, [districtSummaries]);

  const highestSickRatioDistrict = useMemo(() => {
    if (!districtSummaries.length) {
      return undefined;
    }

    return districtSummaries.reduce<
      { name: string; sick: number; total: number; ratio: number } | undefined
    >((acc, item) => {
      if (item.total <= 0) {
        return acc;
      }
      const ratio = item.sick / item.total;
      if (!acc || ratio > acc.ratio) {
        return { name: item.name, sick: item.sick, total: item.total, ratio };
      }
      return acc;
    }, undefined);
  }, [districtSummaries]);

  const highestRiskEntry = useMemo(() => {
    if (!locationAggregates.length) {
      return undefined;
    }
    return [...locationAggregates].sort((a, b) => b.risk - a.risk)[0];
  }, [locationAggregates]);

  const highestRiskRatioEntry = useMemo(() => {
    if (!locationAggregates.length) {
      return undefined;
    }
    return [...locationAggregates]
      .filter((item) => item.total > 0)
      .sort((a, b) => b.risk / b.total - a.risk / a.total)[0];
  }, [locationAggregates]);

  const highestSickEntry = useMemo(() => {
    if (!locationAggregates.length) {
      return undefined;
    }
    return [...locationAggregates].sort((a, b) => b.sick - a.sick)[0];
  }, [locationAggregates]);

  const topRiskVillages = useMemo(() => {
    return locationAggregates
      .filter((item) => item.village)
      .sort((a, b) => b.risk - a.risk)
      .slice(0, 5);
  }, [locationAggregates]);

  const referLocations = useMemo(
    () => locationAggregates.filter((item) => item.refer > 0),
    [locationAggregates]
  );

  const averageRefer = referLocations.length
    ? totalRefer / referLocations.length
    : 0;

  const significantChanges = useMemo(() => {
    if (!summary || !data?.lineChart || data.lineChart.labels.length < 2) {
      return [];
    }

    const datasets = data.lineChart.datasets ?? [];
    const normalDataset = datasets.find((item) => item.label === "ปกติ");
    const riskDataset = datasets.find((item) => item.label === "เสี่ยง");
    const sickDataset = datasets.find((item) => item.label === "ป่วย");

    const normalValues = Array.isArray(normalDataset?.data)
      ? normalDataset?.data
      : [];
    const riskValues = Array.isArray(riskDataset?.data)
      ? riskDataset?.data
      : [];
    const sickValues = Array.isArray(sickDataset?.data)
      ? sickDataset?.data
      : [];

    const previousRisk = Number(riskValues[riskValues.length - 2] ?? 0);
    const latestRisk = Number(riskValues[riskValues.length - 1] ?? 0);
    const previousSick = Number(sickValues[sickValues.length - 2] ?? 0);
    const latestSick = Number(sickValues[sickValues.length - 1] ?? 0);

    const percentChange = (latest: number, previous: number) => {
      if (previous <= 0) {
        return latest > 0 ? 100 : 0;
      }
      return ((latest - previous) / previous) * 100;
    };

    const insights: Array<{
      title: string;
      description: string;
      variant: "warning" | "destructive" | "success";
    }> = [];

    const riskPercentChange = percentChange(latestRisk, previousRisk);
    const sickPercentChange = percentChange(latestSick, previousSick);
    const riskAbsoluteChange = Math.round(latestRisk - previousRisk);
    const sickAbsoluteChange = Math.round(latestSick - previousSick);

    const formatChangeDetail = (diff: number) => {
      if (diff === 0) {
        return "เทียบเดือนก่อนเท่าเดิม";
      }
      const direction = diff > 0 ? "เพิ่มขึ้น" : "ลดลง";
      return `${direction} ${Math.abs(diff).toLocaleString()} คนจากเดือนก่อน`;
    };

    if (riskPercentChange >= 20) {
      insights.push({
        title: "ความเสี่ยงเพิ่มสูง",
        description: formatChangeDetail(riskAbsoluteChange),
        variant: "warning",
      });
    }

    if (
      !insights.length &&
      riskPercentChange <= -10 &&
      sickPercentChange <= -10
    ) {
      const riskDecreaseText = `เสี่ยงลดลง ${Math.abs(
        riskAbsoluteChange
      ).toLocaleString()} คน`;
      const sickDecreaseText = `ป่วยลดลง ${Math.abs(
        sickAbsoluteChange
      ).toLocaleString()} คน`;
      insights.push({
        title: "แนวโน้มดีขึ้น",
        description: `${riskDecreaseText} · ${sickDecreaseText} (เทียบเดือนก่อน)`,
        variant: "success",
      });
    }

    return insights;
  }, [data?.lineChart, summary]);

  const selectedPeriodLabel = useMemo(() => {
    if (!appliedFilters) {
      return "ทั้งหมด";
    }

    if (appliedFilters.year) {
      const yearText = appliedFilters.year;
      if (appliedFilters.month) {
        const monthNumber = Number(appliedFilters.month);
        const monthIndex = Math.max(1, Math.min(12, Math.trunc(monthNumber)));
        const monthName =
          THAI_MONTH_LABELS[monthIndex] ?? `เดือนที่ ${appliedFilters.month}`;
        return `${monthName} ${yearText}`;
      }
      return `ปี ${yearText}`;
    }

    return data?.metadata?.period ?? "ทั้งหมด";
  }, [appliedFilters, data?.metadata?.period]);

  const formatLocation = useCallback(
    (entry?: {
      village?: string;
      subdistrict?: string;
      district?: string;
      moo?: string;
    }) => {
      if (!entry) {
        return "ไม่พบข้อมูล";
      }
      const parts: string[] = [];
      if (entry.village) {
        parts.push(entry.village);
      }
      if (selectedMooLabel) {
        parts.push(selectedMooLabel);
      } else if (entry.moo) {
        parts.push(`หมู่ที่ ${entry.moo}`);
      }
      if (entry.subdistrict) {
        parts.push(entry.subdistrict);
      }
      if (entry.district) {
        parts.push(entry.district);
      }
      return parts.length ? parts.join(" • ") : "ไม่พบข้อมูล";
    },
    [selectedMooLabel]
  );

  type SummaryMetricKey = "total" | "normal" | "risk" | "sick";

  const formatMetricWithUnit = (value: number, unit: string = "คน") => {
    return `${toValidNumber(value).toLocaleString()} ${unit}`;
  };

  const formatMetricDelta = (value: number, unit: string = "คน") => {
    if (!Number.isFinite(value)) {
      return "-";
    }
    if (value === 0) {
      return "±0";
    }
    const sign = value > 0 ? "+" : "";
    return `${sign}${Math.trunc(value).toLocaleString()} ${unit}`;
  };

  const metricTone = (key: SummaryMetricKey, value: number) => {
    if (!Number.isFinite(value) || value === 0) {
      return "muted" as const;
    }
    if (key === "normal" || key === "total") {
      return value >= 0 ? ("success" as const) : ("destructive" as const);
    }
    return value >= 0 ? ("warning" as const) : ("success" as const);
  };

  const metricTrend = (value: number) => {
    if (!Number.isFinite(value) || value === 0) {
      return "neutral" as const;
    }
    return value > 0 ? ("up" as const) : ("down" as const);
  };

  const detailStats = useMemo(() => {
    const totals = adjustedTotals;
    if (!totals.total) {
      return [];
    }
    const baseline = baselineTotals;
    const diff = diffTotals;
    const percent = (value: number) =>
      totals.total ? `${((value / totals.total) * 100).toFixed(1)}%` : "0%";

    const buildStat = <T extends SummaryMetricKey>(
      key: T,
      title: string,
      icon: typeof Users,
      variant: "default" | "success" | "warning" | "destructive"
    ) => {
      const value = totals[key];
      return {
        key,
        title,
        value: value.toLocaleString(),
        percentage: key === "total" ? "100%" : percent(value),
        icon,
        variant: variant as const,
        baseline: baseline[key],
        diff: diff[key],
      };
    };

    const stats = [
      buildStat("total", "รวมทั้งหมด", Users, "default"),
      buildStat("normal", "ปกติ", UserCheck, "success"),
      buildStat("risk", "กลุ่มเสี่ยง", AlertTriangle, "warning"),
      buildStat("sick", "ป่วย", ActivitySquare, "destructive"),
    ];

    stats.push({
      key: "refer",
      title: "ส่งต่อหน่วยบริการ",
      value: totalRefer.toLocaleString(),
      percentage: referLocations.length
        ? `${referLocations.length.toLocaleString()} พื้นที่`
        : "ไม่มีข้อมูล",
      icon: Stethoscope,
      variant: "default" as const,
    });

    return stats;
  }, [
    adjustedTotals,
    baselineTotals,
    diffTotals,
    referLocations.length,
    totalRefer,
  ]);

  const locationInsights = useMemo(() => {
    if (!appliedFilters || !summary) {
      return [];
    }
    const insights: Array<{ title: string; description: string }> = [];
    insights.push({
      title: "ช่วงเวลาที่แสดงผล",
      description: `${selectedPeriodLabel} รวม ${totalPeople.toLocaleString()} คน`,
    });

    if (highestRiskEntry) {
      insights.push({
        title: "พื้นที่ที่มีจำนวนกลุ่มเสี่ยงสูง",
        description: `${formatLocation(
          highestRiskEntry
        )} เสี่ยง ${highestRiskEntry.risk.toLocaleString()} คน`,
      });
    }

    if (highestRiskRatioEntry && highestRiskRatioEntry.total > 0) {
      insights.push({
        title: "อัตราความเสี่ยงสูงสุด",
        description: `${formatLocation(highestRiskRatioEntry)} คิดเป็น ${(
          (highestRiskRatioEntry.risk / highestRiskRatioEntry.total) *
          100
        ).toFixed(1)}% ของพื้นที่นั้น`,
      });
    }

    if (highestSickEntry && highestSickEntry.sick > 0) {
      insights.push({
        title: "พื้นที่ที่พบผู้ป่วยมากที่สุด",
        description: `${formatLocation(
          highestSickEntry
        )} ป่วย ${highestSickEntry.sick.toLocaleString()} คน`,
      });
    }

    if (totalRefer > 0) {
      insights.push({
        title: "การส่งต่อผู้ป่วย",
        description: `ส่งต่อ ${totalRefer.toLocaleString()} ครั้ง · เฉลี่ย ${averageRefer.toFixed(
          1
        )} ครั้ง/พื้นที่`,
      });
    }

    return insights.slice(0, 4);
  }, [
    appliedFilters,
    averageRefer,
    highestRiskEntry,
    highestRiskRatioEntry,
    highestSickEntry,
    selectedPeriodLabel,
    formatLocation,
    summary,
    totalPeople,
    totalRefer,
  ]);

  const quickHighlights = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      detail: string;
      tone: "muted" | "success" | "warning" | "destructive";
    }> = [];

    significantChanges.forEach((item, index) => {
      items.push({
        id: `change-${index}`,
        title: item.title,
        detail: item.description,
        tone: item.variant,
      });
    });

    locationInsights.forEach((insight, index) => {
      items.push({
        id: `insight-${index}`,
        title: insight.title,
        detail: insight.description,
        tone: "muted",
      });
    });

    return items.slice(0, 6);
  }, [locationInsights, significantChanges]);
  const renderFactorGrid = (mode: "absolute" | "percentage") => {
    const isPercentage = mode === "percentage";
    const formatValue = (value: number, base: number) => {
      const numeric = toValidNumber(value);
      if (!isPercentage) {
        return numeric.toLocaleString();
      }
      if (!base) {
        return numeric === 0 ? "0%" : "-";
      }
      return `${((numeric / base) * 100).toFixed(1)}%`;
    };

    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">ภาพรวม</p>
              <p className="text-2xl font-semibold text-primary">
                {formatValue(overviewTotals.total, overviewTotals.total)}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-xs md:text-sm">
              <div>
                <p className="text-muted-foreground">ปกติ</p>
                <p className="font-medium text-success">
                  {formatValue(overviewTotals.normal, overviewTotals.total)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">เสี่ยง</p>
                <p className="font-medium text-warning">
                  {formatValue(overviewTotals.risk, overviewTotals.total)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">ป่วย</p>
                <p className="font-medium text-destructive">
                  {formatValue(overviewTotals.sick, overviewTotals.total)}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {categorySummary.factors.map((category) => {
            const categoryTotal = toValidNumber(category.total);
            return (
              <div
                key={category.key ?? category.name}
                className="rounded-lg border bg-background p-4 space-y-3"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">{category.name}</p>
                  <p className="text-lg font-semibold text-primary">
                    {formatValue(categoryTotal, overviewTotals.total)}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs md:text-sm">
                  <div>
                    <p className="text-muted-foreground">ปกติ</p>
                    <p className="font-medium text-success">
                      {formatValue(
                        toValidNumber(category.normal),
                        categoryTotal
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">เสี่ยง</p>
                    <p className="font-medium text-warning">
                      {formatValue(toValidNumber(category.risk), categoryTotal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">ป่วย</p>
                    <p className="font-medium text-destructive">
                      {formatValue(toValidNumber(category.sick), categoryTotal)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const hasMoreRecords = recordsPagination?.hasMore ?? false;
  const totalRecordPages =
    recordsPagination && recordsPagination.limit
      ? Math.max(
          1,
          Math.ceil((recordsPagination.total || 0) / recordsPagination.limit)
        )
      : 1;
  const isRecordsInitialLoading =
    recordsQuery.fetchStatus === "fetching" &&
    recordsQuery.status === "pending";
  const isRecordsRefreshing =
    recordsQuery.fetchStatus === "fetching" &&
    recordsQuery.status !== "pending";

  const donutData = useMemo(() => {
    if (!adjustedTotals.total) {
      return null;
    }
    return {
      labels: ["ปกติ", "เสี่ยง", "ป่วย"],
      datasets: [
        {
          data: [
            adjustedTotals.normal,
            adjustedTotals.risk,
            adjustedTotals.sick,
          ],
          backgroundColor: [
            "hsl(var(--success))",
            "hsl(var(--warning))",
            "hsl(var(--destructive))",
          ],
          borderWidth: 0,
        },
      ],
    };
  }, [adjustedTotals]);

  const handleCurrentFilterChange = <T extends keyof DetailFilters>(
    key: T,
    value: DetailFilters[T]
  ) => {
    setCurrentFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "targetGroup"
        ? {
            district: "",
            subdistrict: "",
            village: "",
            moo: "",
            year: "",
            month: "",
          }
        : {}),
      ...(key === "district" ? { subdistrict: "", village: "", moo: "" } : {}),
      ...(key === "subdistrict" ? { village: "", moo: "" } : {}),
      ...(key === "village" ? { moo: "" } : {}),
      ...(key === "year" ? { month: "" } : {}),
    }));
  };

  const handleSearch = () => {
    setRecordsPage(1);
    setAppliedFilters({ ...currentFilters });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8 space-y-8">
        <header className="space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold">
            รายละเอียดข้อมูลอำเภอ
          </h2>
          <p className="text-muted-foreground">
            วิเคราะห์ข้อมูลเชิงลึกแยกตามพื้นที่และช่วงเวลา
          </p>
        </header>

        {isError && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="py-3 text-sm text-destructive">
              ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Search className="w-4 h-4" />
              ตัวกรองข้อมูล
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <span className="text-sm font-medium flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  กลุ่มเป้าหมาย
                </span>
                <Select
                  value={currentFilters.targetGroup}
                  onValueChange={(value) =>
                    handleCurrentFilterChange("targetGroup", value)
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="เลือกกลุ่มเป้าหมาย" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetGroupOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <span className="text-sm font-medium flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  อำเภอ
                </span>
                <Select
                  value={currentFilters.district || ALL_DISTRICT_VALUE}
                  onValueChange={(value) =>
                    handleCurrentFilterChange(
                      "district",
                      value === ALL_DISTRICT_VALUE ? "" : value
                    )
                  }
                  disabled={
                    user?.role === "officer" || !availability?.districts?.length
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="เลือกอำเภอ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_DISTRICT_VALUE}>ทั้งหมด</SelectItem>
                    {availability?.districts.map((district) => (
                      <SelectItem key={district} value={district}>
                        {district}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <span className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  ตำบล
                </span>
                <Select
                  value={currentFilters.subdistrict || ALL_SUBDISTRICT_VALUE}
                  onValueChange={(value) =>
                    handleCurrentFilterChange(
                      "subdistrict",
                      value === ALL_SUBDISTRICT_VALUE ? "" : value
                    )
                  }
                  disabled={!subdistrictOptions.length}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="เลือกตำบล" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_SUBDISTRICT_VALUE}>
                      ทั้งหมด
                    </SelectItem>
                    {subdistrictOptions.map((subdistrict) => (
                      <SelectItem key={subdistrict} value={subdistrict}>
                        {subdistrict}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <span className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  หมู่บ้าน
                </span>
                <Select
                  value={currentFilters.village || ALL_VILLAGE_VALUE}
                  onValueChange={(value) =>
                    handleCurrentFilterChange(
                      "village",
                      value === ALL_VILLAGE_VALUE ? "" : value
                    )
                  }
                  disabled={!villageOptions.length}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="เลือกหมู่บ้าน" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VILLAGE_VALUE}>ทั้งหมด</SelectItem>
                    {villageOptions.map((village) => (
                      <SelectItem key={village} value={village}>
                        {village}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <span className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  หมู่ที่
                </span>
                <Select
                  value={currentFilters.moo || ALL_MOO_VALUE}
                  onValueChange={(value) =>
                    handleCurrentFilterChange(
                      "moo",
                      value === ALL_MOO_VALUE ? "" : value
                    )
                  }
                  disabled={!mooOptions.length}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="เลือกหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_MOO_VALUE}>ทั้งหมด</SelectItem>
                    {mooOptions.map((moo) => (
                      <SelectItem key={moo} value={moo}>
                        {moo.toLowerCase().startsWith("หมู่")
                          ? moo
                          : `หมู่ที่ ${moo}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <span className="text-sm font-medium flex items-center gap-2">
                  <ActivitySquare className="w-4 h-4 text-primary" />
                  ปี
                </span>
                <Select
                  value={currentFilters.year || ALL_YEAR_VALUE}
                  onValueChange={(value) =>
                    handleCurrentFilterChange(
                      "year",
                      value === ALL_YEAR_VALUE ? "" : value
                    )
                  }
                  disabled={!availability?.years?.length}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="เลือกปี" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_YEAR_VALUE}>ทั้งหมด</SelectItem>
                    {availability?.years.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <span className="text-sm font-medium flex items-center gap-2">
                  <ActivitySquare className="w-4 h-4 text-primary" />
                  เดือน
                </span>
                <Select
                  value={currentFilters.month || ALL_MONTH_VALUE}
                  onValueChange={(value) =>
                    handleCurrentFilterChange(
                      "month",
                      value === ALL_MONTH_VALUE ? "" : value
                    )
                  }
                  disabled={!currentFilters.year || !monthOptions.length}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="เลือกเดือน" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_MONTH_VALUE}>ทั้งหมด</SelectItem>
                    {monthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-center md:justify-end">
              <Button
                onClick={handleSearch}
                className="gap-2"
                disabled={isSearchDisabled}
              >
                <Search className="w-4 h-4" />
                ค้นหาข้อมูล
              </Button>
            </div>
          </CardContent>
        </Card>

        {!appliedFilters ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              กรุณาเลือกตัวกรองที่ต้องการแล้วกดปุ่ม "ค้นหาข้อมูล"
              เพื่อแสดงรายละเอียด
            </CardContent>
          </Card>
        ) : showInitialLoading ? (
          <LoadingState message="กำลังโหลดข้อมูลรายละเอียด..." />
        ) : (
          <>
            <section className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline">
                  ช่วงเวลา: {selectedPeriodLabel || "ไม่ระบุ"}
                </Badge>
                {activeFilters?.district && (
                  <Badge variant="outline">
                    อำเภอ: {activeFilters.district}
                  </Badge>
                )}
                {activeFilters?.subdistrict && (
                  <Badge variant="outline">
                    ตำบล: {activeFilters.subdistrict}
                  </Badge>
                )}
                {activeFilters?.village && (
                  <Badge variant="outline">
                    หมู่บ้าน: {activeFilters.village}
                  </Badge>
                )}
                {activeFilters?.moo && (
                  <Badge variant="outline">หมู่ที่: {activeFilters.moo}</Badge>
                )}
              </div>

              {summary ? (
                <>
                  <section className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                      {detailStats.map((stat) => {
                        const details: Array<{
                          label: string;
                          value: string;
                          tone?:
                            | "default"
                            | "muted"
                            | "success"
                            | "warning"
                            | "destructive";
                        }> = [];

                        if (
                          typeof stat.baseline === "number" &&
                          Number.isFinite(stat.baseline) &&
                          stat.key !== "refer"
                        ) {
                          details.push({
                            label: "ก่อนปรับ",
                            value: formatMetricWithUnit(stat.baseline),
                            tone: "muted",
                          });
                        }
                        if (
                          typeof stat.diff === "number" &&
                          Number.isFinite(stat.diff) &&
                          stat.key !== "refer"
                        ) {
                          details.push({
                            label: "เปลี่ยนแปลง",
                            value: formatMetricDelta(stat.diff),
                            tone: metricTone(
                              stat.key as SummaryMetricKey,
                              stat.diff
                            ),
                          });
                        }

                        return (
                          <StatsCard
                            key={stat.key}
                            title={stat.title}
                            value={stat.value}
                            percentage={stat.percentage}
                            icon={stat.icon}
                            variant={stat.variant}
                            details={details}
                            delta={
                              typeof stat.diff === "number" &&
                              Number.isFinite(stat.diff) &&
                              stat.key !== "refer"
                                ? {
                                    value: formatMetricDelta(stat.diff),
                                    trend: metricTrend(stat.diff),
                                    label: "เทียบก่อนปรับ",
                                  }
                                : undefined
                            }
                          />
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            ไฮไลต์ล่าสุด
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {quickHighlights.length ? (
                            <ul className="space-y-2">
                              {quickHighlights.map((item) => {
                                const toneClass =
                                  item.tone === "success"
                                    ? "text-success"
                                    : item.tone === "warning"
                                    ? "text-warning"
                                    : item.tone === "destructive"
                                    ? "text-destructive"
                                    : "text-muted-foreground";
                                return (
                                  <li key={item.id} className="text-sm">
                                    <p className={`font-semibold ${toneClass}`}>
                                      {item.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {item.detail}
                                    </p>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              เลือกตัวกรองและกดค้นหาเพื่อดูข้อมูลเชิงลึก
                            </p>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-warning" />
                            พื้นที่ที่ต้องเฝ้าระวัง
                          </CardTitle>
                          <CardDescription>
                            5 อันดับแรกตามจำนวนผู้เสี่ยง
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {topRiskVillages.length ? (
                            <div className="space-y-3 text-sm">
                              {topRiskVillages.map((item, index) => (
                                <div
                                  key={`${item.district}-${item.subdistrict}-${item.village}-${index}`}
                                  className="flex items-start justify-between rounded-md border bg-muted/30 p-3"
                                >
                                  <div>
                                    <p className="font-semibold text-foreground">
                                      {index + 1}.{" "}
                                      {item.village || "ไม่ระบุหมู่บ้าน"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {[
                                        selectedMooLabel,
                                        item.subdistrict,
                                        item.district,
                                      ]
                                        .filter(Boolean)
                                        .join(" • ")}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium text-warning">
                                      {item.risk.toLocaleString()} คน
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      ทั้งหมด {item.total.toLocaleString()} คน
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              ยังไม่มีข้อมูลพื้นที่เสี่ยงสำหรับตัวกรองนี้
                            </p>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2">
                            <Stethoscope className="h-5 w-5 text-primary" />
                            การส่งต่อหน่วยบริการ
                          </CardTitle>
                          <CardDescription>
                            ภาพรวมการส่งต่อในตัวกรองนี้
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-muted-foreground">
                          {totalRefer > 0 ? (
                            <>
                              <div className="flex items-center justify-between text-foreground">
                                <span>จำนวนส่งต่อทั้งหมด</span>
                                <span className="font-semibold text-primary">
                                  {totalRefer.toLocaleString()} ครั้ง
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>พื้นที่ที่มีการส่งต่อ</span>
                                <span className="font-medium">
                                  {referLocations.length.toLocaleString()}{" "}
                                  พื้นที่
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>เฉลี่ยต่อพื้นที่</span>
                                <span className="font-medium">
                                  {averageRefer.toFixed(1)} ครั้ง
                                </span>
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              ยังไม่มีการบันทึกข้อมูลการส่งต่อหน่วยบริการในตัวกรองนี้
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </section>

                  <Separator />
                </>
              ) : null}

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>สัดส่วนสถานะผู้รับการประเมิน</CardTitle>
                    <CardDescription>แบ่งสัดส่วนตามสถานะล่าสุด</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {summary && donutData ? (
                      <div className="max-w-md mx-auto">
                        <DonutChart data={donutData} />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        ไม่มีข้อมูลสำหรับการแสดงในช่วงเวลานี้
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>แนวโน้มข้อมูลตามช่วงเวลา</CardTitle>
                    <CardDescription>การเปลี่ยนแปลงรายเดือน</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(groupedData).length > 1 ? (
                      <LineChart
                        data={{
                          labels: Object.keys(groupedData),
                          datasets: [
                            {
                              label: "ปกติ",
                              data: Object.values(groupedData).map(
                                (districts) => {
                                  return Object.values(districts).reduce(
                                    (total, subdistricts) => {
                                      return (
                                        total +
                                        Object.values(subdistricts).reduce(
                                          (subTotal, villages) => {
                                            return (
                                              subTotal +
                                              villages.reduce(
                                                (villageTotal, village) =>
                                                  villageTotal + village.normal,
                                                0
                                              )
                                            );
                                          },
                                          0
                                        )
                                      );
                                    },
                                    0
                                  );
                                }
                              ),
                              borderColor: "hsl(var(--success))",
                              backgroundColor: "hsla(var(--success), 0.1)",
                              tension: 0.4,
                            },
                            {
                              label: "เสี่ยง",
                              data: Object.values(groupedData).map(
                                (districts) => {
                                  return Object.values(districts).reduce(
                                    (total, subdistricts) => {
                                      return (
                                        total +
                                        Object.values(subdistricts).reduce(
                                          (subTotal, villages) => {
                                            return (
                                              subTotal +
                                              villages.reduce(
                                                (villageTotal, village) =>
                                                  villageTotal + village.risk,
                                                0
                                              )
                                            );
                                          },
                                          0
                                        )
                                      );
                                    },
                                    0
                                  );
                                }
                              ),
                              borderColor: "hsl(var(--warning))",
                              backgroundColor: "hsla(var(--warning), 0.1)",
                              tension: 0.4,
                            },
                            {
                              label: "ป่วย",
                              data: Object.values(groupedData).map(
                                (districts) => {
                                  return Object.values(districts).reduce(
                                    (total, subdistricts) => {
                                      return (
                                        total +
                                        Object.values(subdistricts).reduce(
                                          (subTotal, villages) => {
                                            return (
                                              subTotal +
                                              villages.reduce(
                                                (villageTotal, village) =>
                                                  villageTotal + village.sick,
                                                0
                                              )
                                            );
                                          },
                                          0
                                        )
                                      );
                                    },
                                    0
                                  );
                                }
                              ),
                              borderColor: "hsl(var(--destructive))",
                              backgroundColor: "hsla(var(--destructive), 0.1)",
                              tension: 0.4,
                            },
                          ],
                        }}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        ต้องมีข้อมูลหลายช่วงเวลาเพื่อแสดงแนวโน้ม
                      </p>
                    )}
                  </CardContent>
                </Card>
              </section>

              <Separator />

              <section>
                <Card className="h-full">
                  <CardHeader className="pb-4 space-y-1">
                    <CardTitle className="flex flex-col gap-1">
                      <span className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        สถานการณ์เชิงพื้นที่
                      </span>
                      <span className="text-sm font-normal text-muted-foreground">
                        คลิกที่อำเภอเพื่อเจาะลึกข้อมูลในหน้ารายละเอียด
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 text-sm">
                      <div className="rounded-lg border bg-background/80 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          จำนวนทั้งหมด
                        </p>
                        <p className="mt-1 text-base font-semibold text-primary">
                          {totalPeople.toLocaleString()} คน
                        </p>
                        {Number.isFinite(diffTotals.total) ? (
                          <p
                            className={`text-xs font-semibold ${
                              metricTone("total", diffTotals.total) ===
                              "success"
                                ? "text-success"
                                : metricTone("total", diffTotals.total) ===
                                  "destructive"
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }`}
                          >
                            {formatMetricDelta(diffTotals.total)}
                          </p>
                        ) : null}
                        <p className="text-xs text-muted-foreground mt-1">
                          รวมกลุ่มเป้าหมายที่สำรวจในจังหวัดแพร่
                        </p>
                      </div>
                      <div className="rounded-lg border bg-background/80 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          กลุ่มเสี่ยงมากที่สุด
                        </p>
                        <p className="mt-1 text-base font-semibold text-warning">
                          {topRiskDistrict?.name ?? "ยังไม่มีข้อมูล"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {topRiskDistrict
                            ? `${topRiskDistrict.risk.toLocaleString()} คน`
                            : "รอข้อมูลล่าสุด"}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-background/80 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          อัตราป่วยสูงสุด
                        </p>
                        <p className="mt-1 text-base font-semibold text-destructive">
                          {highestSickRatioDistrict
                            ? `${(highestSickRatioDistrict.ratio * 100).toFixed(
                                1
                              )}%`
                            : "ยังไม่มีข้อมูล"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {highestSickRatioDistrict
                            ? `${
                                highestSickRatioDistrict.name
                              } (${highestSickRatioDistrict.sick.toLocaleString()} คน)`
                            : "รอข้อมูลล่าสุด"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <Separator />

              <Card>
                <CardHeader>
                  <CardTitle>การจำแนกตามปัจจัยเสี่ยงหลัก</CardTitle>
                  <CardDescription>
                    แสดงจำนวนผู้คัดกรองในแต่ละปัจจัยเทียบกับภาพรวม
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {categorySummary.factors.length ? (
                    <Tabs
                      value={factorView}
                      onValueChange={(value) =>
                        setFactorView(
                          (value as "absolute" | "percentage") || "absolute"
                        )
                      }
                      className="space-y-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <TabsList className="grid w-full grid-cols-2 sm:w-auto">
                          <TabsTrigger value="absolute">จำนวนจริง</TabsTrigger>
                          <TabsTrigger value="percentage">
                            สัดส่วน (%)
                          </TabsTrigger>
                        </TabsList>
                        <p className="text-xs text-muted-foreground sm:text-right">
                          {factorView === "percentage"
                            ? "สัดส่วนเทียบกับภาพรวมและภายในแต่ละปัจจัย"
                            : "จำนวนผู้ที่อยู่ในแต่ละปัจจัยและสถานะ"}
                        </p>
                      </div>
                      <TabsContent value="absolute" className="space-y-4">
                        {renderFactorGrid("absolute")}
                      </TabsContent>
                      <TabsContent value="percentage" className="space-y-4">
                        {renderFactorGrid("percentage")}
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      ยังไม่มีข้อมูลจำแนกตามปัจจัยเสี่ยงสำหรับเงื่อนไขที่เลือก
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>รายละเอียดข้อมูลรายพื้นที่</CardTitle>
                  <CardDescription>
                    ค้นหาด้วยชื่ออำเภอ ตำบล หมู่บ้าน หมู่ที่
                    หรือช่วงเวลาเพื่อกรองรายการ
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Input
                      value={locationSearchTerm}
                      onChange={(event) =>
                        setLocationSearchTerm(event.target.value)
                      }
                      placeholder="ค้นหาอำเภอ / ตำบล / หมู่บ้าน / หมู่ที่ หรือช่วงเวลา"
                      className="w-full sm:w-64"
                      disabled={!hasAnyData}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowReferMetrics((prev) => !prev)}
                        disabled={!hasAnyData}
                      >
                        {showReferMetrics
                          ? "ซ่อนคอลัมน์ส่งต่อ"
                          : "แสดงคอลัมน์ส่งต่อ"}
                      </Button>
                      {locationSearchTerm ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocationSearchTerm("")}
                        >
                          ล้างการค้นหา
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {showRefreshing ? (
                    <p className="text-sm text-muted-foreground">
                      กำลังอัปเดตข้อมูล...
                    </p>
                  ) : !hasAnyData ? (
                    <p className="text-sm text-muted-foreground">
                      ไม่มีข้อมูลในช่วงเวลาที่เลือก
                    </p>
                  ) : !hasFilteredResults && isFilteringLocations ? (
                    <p className="text-sm text-muted-foreground">
                      ไม่พบพื้นที่ที่ตรงกับคำค้น "{locationSearchTerm.trim()}"
                    </p>
                  ) : (
                    <Accordion type="single" collapsible className="w-full">
                      {Object.entries(filteredGroupedData).map(
                        ([periodKey, districts]) => (
                          <AccordionItem key={periodKey} value={periodKey}>
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center justify-between w-full mr-4">
                                <span className="text-left font-medium">
                                  {periodKey}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  อำเภอ:{" "}
                                  {Object.keys(
                                    districts
                                  ).length.toLocaleString()}
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4">
                              <div className="space-y-4">
                                {Object.entries(districts).map(
                                  ([districtKey, subdistricts]) => (
                                    <Card
                                      key={districtKey}
                                      className="border-muted"
                                    >
                                      <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                          <CardTitle className="text-lg flex items-center gap-2">
                                            <Layers className="w-4 h-4" />
                                            {districtKey}
                                          </CardTitle>
                                          <span className="text-sm text-muted-foreground">
                                            ตำบล:{" "}
                                            {Object.keys(subdistricts).length}
                                          </span>
                                        </div>
                                      </CardHeader>
                                      <CardContent className="space-y-3">
                                        {Object.entries(subdistricts).map(
                                          ([subdistrictKey, villages]) => (
                                            <div
                                              key={subdistrictKey}
                                              className="space-y-2"
                                            >
                                              <div className="flex items-center gap-2 pb-2 border-b">
                                                <MapPin className="w-4 h-4 text-primary" />
                                                <span className="font-medium">
                                                  {subdistrictKey}
                                                </span>
                                                <span className="text-sm text-muted-foreground ml-auto">
                                                  หมู่บ้าน: {villages.length}
                                                </span>
                                              </div>
                                              <div className="grid grid-cols-1 gap-2 pl-6">
                                                {villages.map(
                                                  (village, index) => (
                                                    <div
                                                      key={index}
                                                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50"
                                                    >
                                                      <div className="flex items-center gap-3">
                                                        <span className="text-sm font-medium">
                                                          หมู่บ้าน{" "}
                                                          {village.village}{" "}
                                                          {village.moo &&
                                                            `- หมู่ที่ ${village.moo}`}
                                                        </span>
                                                      </div>
                                                      <div className="flex items-center gap-6 text-sm">
                                                        <div className="text-center">
                                                          <div className="text-xs text-muted-foreground">
                                                            ปกติ
                                                          </div>
                                                          <div className="font-medium text-success">
                                                            {village.normal.toLocaleString()}
                                                          </div>
                                                        </div>
                                                        <div className="text-center">
                                                          <div className="text-xs text-muted-foreground">
                                                            เสี่ยง
                                                          </div>
                                                          <div className="font-medium text-warning">
                                                            {village.risk.toLocaleString()}
                                                          </div>
                                                        </div>
                                                        <div className="text-center">
                                                          <div className="text-xs text-muted-foreground">
                                                            ป่วย
                                                          </div>
                                                          <div className="font-medium text-destructive">
                                                            {village.sick.toLocaleString()}
                                                          </div>
                                                        </div>
                                                        <div className="text-center">
                                                          <div className="text-xs text-muted-foreground">
                                                            รวม
                                                          </div>
                                                          <div className="font-medium">
                                                            {(
                                                              village.total ||
                                                              village.normal +
                                                                village.risk +
                                                                village.sick
                                                            ).toLocaleString()}
                                                          </div>
                                                        </div>
                                                        {showReferMetrics ? (
                                                          <div className="text-center">
                                                            <div className="text-xs text-muted-foreground">
                                                              ส่งต่อ
                                                            </div>
                                                            <div className="font-medium">
                                                              {(
                                                                village.referCount ??
                                                                0
                                                              ).toLocaleString()}
                                                            </div>
                                                          </div>
                                                        ) : null}
                                                      </div>
                                                    </div>
                                                  )
                                                )}
                                              </div>
                                            </div>
                                          )
                                        )}
                                      </CardContent>
                                    </Card>
                                  )
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )
                      )}
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Detail;
