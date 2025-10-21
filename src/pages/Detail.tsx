import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/useAuth";
import { googleSheetsApi, type DashboardDetailRow } from "@/services/googleSheetsApi";
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
  const [currentFilters, setCurrentFilters] = useState<DetailFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<DetailFilters | null>(null);
  const [recordsPage, setRecordsPage] = useState(1);
  const recordsLimit = 50;
  const [searchParams] = useSearchParams();
  const lastAppliedQueryRef = useRef<string | null>(null);

  useEffect(() => {
    if (user?.role === "officer" && user.district) {
      setCurrentFilters((prev) => (prev.district ? prev : { ...prev, district: user.district }));
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

    const normalizedTargetGroup = targetGroupOptions.some((option) => option.value === targetGroupParam)
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

  const availabilityQuery = useQuery({
    queryKey: ["detail", "availability", currentFilters.targetGroup],
    queryFn: () =>
      googleSheetsApi.getDashboardData({
        targetGroup: currentFilters.targetGroup,
      }),
    select: (response) => response?.availability,
    staleTime: DETAIL_STALE_TIME,
    gcTime: DETAIL_GC_TIME,
  });

  const districtsQuery = useQuery({
    queryKey: ["districts"],
    queryFn: () => googleSheetsApi.getDistricts(),
  });

  const detailQuery = useQuery({
    enabled: !!appliedFilters,
    queryKey: [
      "detail",
      appliedFilters?.targetGroup ?? "all",
      appliedFilters?.district || "all",
      appliedFilters?.subdistrict || "all",
      appliedFilters?.village || "all",
      appliedFilters?.year || "all-year",
      appliedFilters?.month || "all-month",
      appliedFilters?.moo || "all-moo",
    ],
    queryFn: () =>
      googleSheetsApi.getDashboardData({
        targetGroup: appliedFilters!.targetGroup,
        district: appliedFilters!.district || undefined,
        subdistrict: appliedFilters!.subdistrict || undefined,
        village: appliedFilters!.village || undefined,
        moo: appliedFilters!.moo || undefined,
        year: appliedFilters!.year ? Number(appliedFilters!.year) : undefined,
        month: appliedFilters!.month ? Number(appliedFilters!.month) : undefined,
      }),
    staleTime: DETAIL_STALE_TIME,
    gcTime: DETAIL_GC_TIME,
  });

  const data = detailQuery.data;
  const availability = data?.availability ?? availabilityQuery.data;
  const isError = detailQuery.isError;

  const recordsQuery = useQuery({
    enabled: !!appliedFilters,
    queryKey: [
      "detail-records",
      appliedFilters?.targetGroup ?? "all",
      appliedFilters?.district || "all",
      appliedFilters?.subdistrict || "all",
      appliedFilters?.village || "all",
      appliedFilters?.year || "all-year",
      appliedFilters?.month || "all-month",
      appliedFilters?.moo || "all-moo",
      recordsPage,
      recordsLimit,
    ],
    queryFn: () =>
      googleSheetsApi.getNcdRecords({
        targetGroup: appliedFilters!.targetGroup,
        district: appliedFilters!.district || undefined,
        subdistrict: appliedFilters!.subdistrict || undefined,
        village: appliedFilters!.village || undefined,
        moo: appliedFilters!.moo || undefined,
        year: appliedFilters!.year ? Number(appliedFilters!.year) : undefined,
        month: appliedFilters!.month ? Number(appliedFilters!.month) : undefined,
        page: recordsPage,
        limit: recordsLimit,
      }),
    staleTime: DETAIL_STALE_TIME,
    gcTime: DETAIL_GC_TIME,
  });

  useEffect(() => {
    if (appliedFilters) {
      setRecordsPage(1);
    }
  }, [appliedFilters]);

  const queryState = getCombinedQueryState([detailQuery, recordsQuery]);
  const showInitialLoading = appliedFilters ? queryState.isInitialLoading : false;
  const showRefreshing = appliedFilters ? queryState.isRefreshing : false;
  const isSearching = queryState.isInitialLoading || queryState.isRefreshing;
  const isSearchDisabled = availabilityQuery.isPending || !availability || isSearching;
  const activeFilters = appliedFilters;
  const selectedMooLabel = appliedFilters?.moo ? `หมู่ที่ ${appliedFilters.moo}` : "";

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

      if (next.district && districts.length > 0 && !districts.includes(next.district)) {
        next.district = "";
        next.subdistrict = "";
        next.village = "";
        next.moo = "";
        changed = true;
      }

      const availableYears = (availability.years ?? []).map((year) => String(year));
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
    if (
      !mapping ||
      !currentFilters.district ||
      !currentFilters.subdistrict
    ) {
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

      if (prev.month && !monthOptions.some((option) => option.value === prev.month)) {
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

  const summary = data?.summary;
  const recordsPagination = recordsQuery.data;
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
    const monthName =
      THAI_MONTH_LABELS[monthIndex] ?? `เดือนที่ ${monthIndex}`;
    return `${monthName} ${yearNumber}`;
  };
  const categorySummary = useMemo(() => {
    if (!data?.categories?.length) {
      return {
        overview: null as
          | {
              total: number;
              normal: number;
              risk: number;
              sick: number;
            }
          | null,
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

  const overviewTotals = useMemo(() => {
    const fallback = {
      total: toValidNumber(summary?.total),
      normal: toValidNumber(summary?.normal),
      risk: toValidNumber(summary?.risk),
      sick: toValidNumber(summary?.sick),
    };

    if (categorySummary.overview) {
      return categorySummary.overview;
    }

    return fallback;
  }, [
    categorySummary.overview,
    summary?.normal,
    summary?.risk,
    summary?.sick,
    summary?.total,
  ]);
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
  };

  const rawDetailRecords = useMemo(() => {
    const paginatedRecords = recordsPagination?.records;
    if (Array.isArray(paginatedRecords) && paginatedRecords.length > 0) {
      return paginatedRecords;
    }

    const fallbackRecords = Array.isArray(data?.detailTable) ? data.detailTable : [];
    if (!fallbackRecords.length) {
      return [];
    }

    if (!appliedFilters) {
      return fallbackRecords;
    }

    return fallbackRecords.filter((row) => {
      const district = typeof row.district === "string" ? row.district : "";
      const subdistrict = typeof row.subdistrict === "string" ? row.subdistrict : "";
      const village = typeof row.village === "string" ? row.village : "";
      const moo = typeof row.moo === "string" ? row.moo : "";
      const year = row.year !== undefined && row.year !== null ? String(row.year) : "";
      const month = row.month !== undefined && row.month !== null ? String(row.month) : "";

      const normalize = (value: string) => value.trim().toLowerCase();

      if (appliedFilters.district && normalize(district) !== normalize(appliedFilters.district)) {
        return false;
      }
      if (
        appliedFilters.subdistrict &&
        normalize(subdistrict) !== normalize(appliedFilters.subdistrict)
      ) {
        return false;
      }
      if (appliedFilters.village && normalize(village) !== normalize(appliedFilters.village)) {
        return false;
      }
      if (appliedFilters.moo && normalize(moo) !== normalize(appliedFilters.moo)) {
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
    const normal = toValidNumber(typedRow.normal ?? overviewMetrics?.normal);
    const risk = toValidNumber(typedRow.risk ?? overviewMetrics?.risk);
    const sick = toValidNumber(typedRow.sick ?? overviewMetrics?.sick);
    const referCount = toValidNumber(typedRow.referCount);
    const period =
      (typeof typedRow.period === "string" && typedRow.period
        ? typedRow.period
        : typeof (typedRow as { periodLabel?: string }).periodLabel === "string" &&
          (typedRow as { periodLabel?: string }).periodLabel
        ? (typedRow as { periodLabel?: string }).periodLabel
        : getPeriodLabel(typedRow.year, typedRow.month)) ?? undefined;
    const hasExplicitTotal =
      typedRow.total !== undefined && typedRow.total !== null && typedRow.total !== "";
    const total = hasExplicitTotal ? toValidNumber(typedRow.total) : normal + risk + sick;

    return {
      ...typedRow,
      normal,
      risk,
      sick,
      total,
      referCount,
      period,
    };
  });

  const groupedData = useMemo(() => {
    const periods: Record<string, Record<string, Record<string, typeof detailRows>>> = {};

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
  const totalPeople = summary?.total ?? 0;
  const totalRefer = useMemo(
    () => detailRows.reduce((acc, row) => acc + (row.referCount ?? 0), 0),
    [detailRows],
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
      const key = `${row.district || ""}|${row.subdistrict || ""}|${row.village || ""}`;
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
    const map = new Map<string, { name: string; risk: number; sick: number; total: number }>();

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

    return districtSummaries.reduce<{ name: string; risk: number } | undefined>((acc, item) => {
      if (!acc || item.risk > acc.risk) {
        return { name: item.name, risk: item.risk };
      }
      return acc;
    }, undefined);
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
    [locationAggregates],
  );

  const averageRefer = referLocations.length ? totalRefer / referLocations.length : 0;

  const significantChanges = useMemo(() => {
    if (!summary || !data?.lineChart || data.lineChart.labels.length < 2) {
      return [];
    }

    const datasets = data.lineChart.datasets ?? [];
    const normalDataset = datasets.find((item) => item.label === "ปกติ");
    const riskDataset = datasets.find((item) => item.label === "เสี่ยง");
    const sickDataset = datasets.find((item) => item.label === "ป่วย");

    const normalValues = Array.isArray(normalDataset?.data) ? normalDataset?.data : [];
    const riskValues = Array.isArray(riskDataset?.data) ? riskDataset?.data : [];
    const sickValues = Array.isArray(sickDataset?.data) ? sickDataset?.data : [];

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

    const insights: Array<{ title: string; description: string; variant: "warning" | "destructive" | "success" }> = [];

    const riskPercentChange = percentChange(latestRisk, previousRisk);
    const sickPercentChange = percentChange(latestSick, previousSick);

    if (riskPercentChange >= 20) {
      insights.push({
        title: "ความเสี่ยงเพิ่มสูง",
        description: `จำนวนผู้มีความเสี่ยงเพิ่มขึ้น ${riskPercentChange.toFixed(1)}% เมื่อเทียบกับช่วงก่อนหน้า`,
        variant: "warning",
      });
    }

    if (!insights.length && riskPercentChange <= -10 && sickPercentChange <= -10) {
      insights.push({
        title: "แนวโน้มดีขึ้น",
        description: `จำนวนกลุ่มเสี่ยงและผู้ป่วยลดลงอย่างเห็นได้ชัดจากช่วงก่อน (${Math.abs(riskPercentChange).toFixed(1)}% และ ${Math.abs(sickPercentChange).toFixed(1)}%)`,
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

  const formatLocation = (
    entry?: { village?: string; subdistrict?: string; district?: string; moo?: string },
  ) => {
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
  };

  const detailStats = useMemo(() => {
    if (!summary) {
      return [];
    }
    const total = summary.total || 0;
    const percent = (value: number) => (total ? `${((value / total) * 100).toFixed(1)}%` : "0%");
    return [
      {
        key: "total",
        title: "รวมทั้งหมด",
        value: summary.total.toLocaleString(),
        percentage: "100%",
        icon: Users,
        variant: "default" as const,
      },
      {
        key: "normal",
        title: "ปกติ",
        value: summary.normal.toLocaleString(),
        percentage: percent(summary.normal),
        icon: UserCheck,
        variant: "success" as const,
      },
      {
        key: "risk",
        title: "กลุ่มเสี่ยง",
        value: summary.risk.toLocaleString(),
        percentage: percent(summary.risk),
        icon: AlertTriangle,
        variant: "warning" as const,
      },
      {
        key: "sick",
        title: "ป่วย",
        value: summary.sick.toLocaleString(),
        percentage: percent(summary.sick),
        icon: ActivitySquare,
        variant: "destructive" as const,
      },
      {
        key: "refer",
        title: "ส่งต่อหน่วยบริการ",
        value: totalRefer.toLocaleString(),
        percentage: referLocations.length ? `${referLocations.length.toLocaleString()} พื้นที่` : "ไม่มีข้อมูล",
        icon: Stethoscope,
        variant: "default" as const,
      },
    ];
  }, [referLocations.length, summary, totalRefer]);

  const locationInsights = useMemo(() => {
    if (!appliedFilters || !summary) {
      return [];
    }
    const insights: Array<{ title: string; description: string }> = [];
    insights.push({
      title: "ช่วงเวลาที่แสดงผล",
      description: `ข้อมูลสะสมรวม ${totalPeople.toLocaleString()} คน ในช่วง ${selectedPeriodLabel}`,
    });

    if (highestRiskEntry) {
      insights.push({
        title: "พื้นที่ที่มีจำนวนกลุ่มเสี่ยงสูง",
        description: `${formatLocation(highestRiskEntry)} พบผู้มีความเสี่ยง ${highestRiskEntry.risk.toLocaleString()} คน`,
      });
    }

    if (highestRiskRatioEntry && highestRiskRatioEntry.total > 0) {
      insights.push({
        title: "อัตราความเสี่ยงสูงสุด",
        description: `${formatLocation(highestRiskRatioEntry)} มีสัดส่วนกลุ่มเสี่ยง ${((highestRiskRatioEntry.risk / highestRiskRatioEntry.total) * 100).toFixed(1)}%`,
      });
    }

    if (highestSickEntry && highestSickEntry.sick > 0) {
      insights.push({
        title: "พื้นที่ที่พบผู้ป่วยมากที่สุด",
        description: `${formatLocation(highestSickEntry)} มีผู้ป่วย ${highestSickEntry.sick.toLocaleString()} คน`,
      });
    }

    if (totalRefer > 0) {
      insights.push({
        title: "การส่งต่อผู้ป่วย",
        description: `ส่งต่อรวม ${totalRefer.toLocaleString()} ครั้ง คิดเป็นเฉลี่ย ${averageRefer.toFixed(1)} ครั้งต่อพื้นที่ที่มีการส่งต่อ`,
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
    summary,
    totalPeople,
    totalRefer,
  ]);

  const hasMoreRecords = recordsPagination?.hasMore ?? false;
  const totalRecordPages =
    recordsPagination && recordsPagination.limit
      ? Math.max(
          1,
          Math.ceil((recordsPagination.total || 0) / recordsPagination.limit)
        )
      : 1;
  const isRecordsInitialLoading =
    recordsQuery.fetchStatus === "fetching" && recordsQuery.status === "pending";
  const isRecordsRefreshing =
    recordsQuery.fetchStatus === "fetching" && recordsQuery.status !== "pending";

  const donutData = useMemo(() => {
    if (!summary) {
      return null;
    }
    return {
      labels: ["ปกติ", "เสี่ยง", "ป่วย"],
      datasets: [
        {
          data: [summary.normal, summary.risk, summary.sick],
          backgroundColor: [
            "hsl(var(--success))",
            "hsl(var(--warning))",
            "hsl(var(--destructive))",
          ],
          borderWidth: 0,
        },
      ],
    };
  }, [summary]);

  const handleCurrentFilterChange = <T extends keyof DetailFilters>(
    key: T,
    value: DetailFilters[T]
  ) => {
    setCurrentFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "targetGroup"
        ? { district: "", subdistrict: "", village: "", moo: "", year: "", month: "" }
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
          <h2 className="text-3xl md:text-4xl font-bold">รายละเอียดข้อมูลอำเภอ</h2>
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
                  <SelectItem value={ALL_SUBDISTRICT_VALUE}>ทั้งหมด</SelectItem>
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
                      {moo.toLowerCase().startsWith("หมู่") ? moo : `หมู่ที่ ${moo}`}
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
              <Button onClick={handleSearch} className="gap-2" disabled={isSearchDisabled}>
                <Search className="w-4 h-4" />
                ค้นหาข้อมูล
              </Button>
            </div>

          </CardContent>
        </Card>

        {!appliedFilters ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              กรุณาเลือกตัวกรองที่ต้องการแล้วกดปุ่ม "ค้นหาข้อมูล" เพื่อแสดงรายละเอียด
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
                  <Badge variant="outline">อำเภอ: {activeFilters.district}</Badge>
                )}
                {activeFilters?.subdistrict && (
                  <Badge variant="outline">ตำบล: {activeFilters.subdistrict}</Badge>
                )}
                {activeFilters?.village && (
                  <Badge variant="outline">หมู่บ้าน: {activeFilters.village}</Badge>
                )}
                {activeFilters?.moo && (
                  <Badge variant="outline">หมู่ที่: {activeFilters.moo}</Badge>
                )}
              </div>

              {summary ? (
                <>
                  <section className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                      {detailStats.map((stat) => (
                        <StatsCard
                          key={stat.key}
                          title={stat.title}
                          value={stat.value}
                          percentage={stat.percentage}
                          icon={stat.icon}
                          variant={stat.variant}
                        />
                      ))}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      <Card>
                        <CardHeader className="pb-2 space-y-1">
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            บทสรุปสำคัญ
                          </CardTitle>
                          <CardDescription>สรุปผลจากข้อมูลที่กรองอยู่</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {significantChanges.length ? (
                            <div className="space-y-2">
                              {significantChanges.map((item) => (
                                <div
                                  key={item.title}
                                  className={`rounded-md border p-3 ${
                                    item.variant === "warning"
                                      ? "border-warning/50 bg-warning/10 text-warning-foreground"
                                      : item.variant === "destructive"
                                      ? "border-destructive/50 bg-destructive/10 text-destructive-foreground"
                                      : "border-success/50 bg-success/10 text-success-foreground"
                                  }`}
                                >
                                  <p className="font-semibold">{item.title}</p>
                                  <p className="text-sm">{item.description}</p>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {locationInsights.length ? (
                            <ul className="space-y-3 text-sm text-muted-foreground">
                              {locationInsights.map((insight) => (
                                <li key={insight.title}>
                                  <p className="font-medium text-foreground">{insight.title}</p>
                                  <p className="mt-1 leading-relaxed">{insight.description}</p>
                                </li>
                              ))}
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
                          <CardDescription>เรียงตามจำนวนผู้มีความเสี่ยง</CardDescription>
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
                                      {index + 1}. {item.village || "ไม่ระบุหมู่บ้าน"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {[selectedMooLabel, item.subdistrict, item.district]
                                        .filter(Boolean)
                                        .join(" • ")}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium text-warning">
                                      {item.risk.toLocaleString()} คน
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      รวม {item.total.toLocaleString()} คน
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
                                  {referLocations.length.toLocaleString()} พื้นที่
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>เฉลี่ยต่อพื้นที่</span>
                                <span className="font-medium">
                                  {averageRefer.toFixed(1)} ครั้ง
                                </span>
                              </div>
                              <p className="text-xs leading-relaxed">
                                ใช้ข้อมูลนี้เพื่อประสานการติดตามผู้ป่วยและจัดสรรทรัพยากรให้เหมาะสม
                              </p>
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
                    <CardDescription>
                      แสดงการเปลี่ยนแปลงของสถานะคัดกรองในช่วงเวลาที่เลือก
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(groupedData).length > 1 ? (
                      <LineChart
                        data={{
                          labels: Object.keys(groupedData),
                          datasets: [
                            {
                              label: "ปกติ",
                              data: Object.values(groupedData).map((districts) => {
                                return Object.values(districts).reduce((total, subdistricts) => {
                                  return total + Object.values(subdistricts).reduce((subTotal, villages) => {
                                    return subTotal + villages.reduce((villageTotal, village) => villageTotal + village.normal, 0);
                                  }, 0);
                                }, 0);
                              }),
                              borderColor: "hsl(var(--success))",
                              backgroundColor: "hsla(var(--success), 0.1)",
                              tension: 0.4,
                            },
                            {
                              label: "เสี่ยง",
                              data: Object.values(groupedData).map((districts) => {
                                return Object.values(districts).reduce((total, subdistricts) => {
                                  return total + Object.values(subdistricts).reduce((subTotal, villages) => {
                                    return subTotal + villages.reduce((villageTotal, village) => villageTotal + village.risk, 0);
                                  }, 0);
                                }, 0);
                              }),
                              borderColor: "hsl(var(--warning))",
                              backgroundColor: "hsla(var(--warning), 0.1)",
                              tension: 0.4,
                            },
                            {
                              label: "ป่วย",
                              data: Object.values(groupedData).map((districts) => {
                                return Object.values(districts).reduce((total, subdistricts) => {
                                  return total + Object.values(subdistricts).reduce((subTotal, villages) => {
                                    return subTotal + villages.reduce((villageTotal, village) => villageTotal + village.sick, 0);
                                  }, 0);
                                }, 0);
                              }),
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
                            ? `${(highestSickRatioDistrict.ratio * 100).toFixed(1)}%`
                            : "ยังไม่มีข้อมูล"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {highestSickRatioDistrict
                            ? `${highestSickRatioDistrict.name} (${highestSickRatioDistrict.sick.toLocaleString()} คน)`
                            : "รอข้อมูลล่าสุด"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-sm font-medium text-foreground">
                        พื้นที่ที่มีข้อมูลในชุดกรองนี้
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        รวม {locationAggregates.length.toLocaleString()} หมู่บ้าน/ชุมชนในตัวกรองปัจจุบัน
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        ครอบคลุมข้อมูลคัดกรอง {detailRows.length.toLocaleString()} รายการ
                      </p>
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
                    <div className="space-y-4">
                      <div className="rounded-lg border bg-muted/30 p-4">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">ภาพรวม</p>
                            <p className="text-2xl font-semibold text-primary">
                              {overviewTotals.total.toLocaleString()}
                            </p>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-xs md:text-sm">
                            <div>
                              <p className="text-muted-foreground">ปกติ</p>
                              <p className="font-medium text-success">
                                {overviewTotals.normal.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">เสี่ยง</p>
                              <p className="font-medium text-warning">
                                {overviewTotals.risk.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">ป่วย</p>
                              <p className="font-medium text-destructive">
                                {overviewTotals.sick.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {categorySummary.factors.map((category) => (
                          <div
                            key={category.key ?? category.name}
                            className="rounded-lg border bg-background p-4 space-y-3"
                          >
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="text-sm font-medium">{category.name}</p>
                              <p className="text-lg font-semibold text-primary">
                                {category.total.toLocaleString()}
                              </p>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-xs md:text-sm">
                              <div>
                                <p className="text-muted-foreground">ปกติ</p>
                                <p className="font-medium text-success">
                                  {category.normal.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">เสี่ยง</p>
                                <p className="font-medium text-warning">
                                  {category.risk.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">ป่วย</p>
                                <p className="font-medium text-destructive">
                                  {category.sick.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      ยังไม่มีข้อมูลจำแนกตามปัจจัยเสี่ยงสำหรับเงื่อนไขที่เลือก
                    </p>
                  )}
                </CardContent>
              </Card>

              </section>

              <Card>
                <CardHeader>
                  <CardTitle>รายละเอียดข้อมูลรายพื้นที่</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {showRefreshing ? (
                    <p className="text-sm text-muted-foreground">
                      กำลังอัปเดตข้อมูล...
                    </p>
                  ) : Object.keys(groupedData).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      ไม่มีข้อมูลในช่วงเวลาที่เลือก
                    </p>
                  ) : (
                    <Accordion type="single" collapsible className="w-full">
                      {Object.entries(groupedData).map(([periodKey, districts]) => (
                        <AccordionItem key={periodKey} value={periodKey}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center justify-between w-full mr-4">
                              <span className="text-left font-medium">
                                {periodKey}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                อำเภอ: {Object.keys(districts).length.toLocaleString()}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-4">
                            <div className="space-y-4">
                              {Object.entries(districts).map(([districtKey, subdistricts]) => (
                                <Card key={districtKey} className="border-muted">
                                  <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                      <CardTitle className="text-lg flex items-center gap-2">
                                        <Layers className="w-4 h-4" />
                                        {districtKey}
                                      </CardTitle>
                                      <span className="text-sm text-muted-foreground">
                                        ตำบล: {Object.keys(subdistricts).length}
                                      </span>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="space-y-3">
                                    {Object.entries(subdistricts).map(([subdistrictKey, villages]) => (
                                      <div key={subdistrictKey} className="space-y-2">
                                        <div className="flex items-center gap-2 pb-2 border-b">
                                          <MapPin className="w-4 h-4 text-primary" />
                                          <span className="font-medium">{subdistrictKey}</span>
                                          <span className="text-sm text-muted-foreground ml-auto">
                                            หมู่บ้าน: {villages.length}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 pl-6">
                                          {villages.map((village, index) => (
                                            <div
                                              key={index}
                                              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50"
                                            >
                                              <div className="flex items-center gap-3">
                                                <span className="text-sm font-medium">
                                                  หมู่บ้าน {village.village} {village.moo && `- หมู่ที่ ${village.moo}`}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-6 text-sm">
                                                <div className="text-center">
                                                  <div className="text-xs text-muted-foreground">ปกติ</div>
                                                  <div className="font-medium text-success">
                                                    {village.normal.toLocaleString()}
                                                  </div>
                                                </div>
                                                <div className="text-center">
                                                  <div className="text-xs text-muted-foreground">เสี่ยง</div>
                                                  <div className="font-medium text-warning">
                                                    {village.risk.toLocaleString()}
                                                  </div>
                                                </div>
                                                <div className="text-center">
                                                  <div className="text-xs text-muted-foreground">ป่วย</div>
                                                  <div className="font-medium text-destructive">
                                                    {village.sick.toLocaleString()}
                                                  </div>
                                                </div>
                                                <div className="text-center">
                                                  <div className="text-xs text-muted-foreground">รวม</div>
                                                  <div className="font-medium">
                                                    {(village.total || village.normal + village.risk + village.sick).toLocaleString()}
                                                  </div>
                                                </div>
                                                <div className="text-center">
                                                  <div className="text-xs text-muted-foreground">ส่งต่อ</div>
                                                  <div className="font-medium">
                                                    {(village.referCount ?? 0).toLocaleString()}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </CardContent>
              </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default Detail;
