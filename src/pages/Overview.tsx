import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ActivitySquare,
  AlertTriangle,
  CalendarClock,
  History,
  RefreshCw,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

import { Navigation } from "@/components/Navigation";
import { StatsCard } from "@/components/StatsCard";
import { LoadingState } from "@/components/LoadingState";
import { HeatMap } from "@/components/HeatMap";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  googleSheetsApi,
  type DashboardAdjustmentCategorySummary,
  type DashboardAdjustmentSummary,
  type DashboardData,
  type DashboardStatsCard,
} from "@/services/googleSheetsApi";
import { getCombinedQueryState } from "@/lib/queryState";

const iconMap = {
  total: Users,
  normal: UserCheck,
  risk: AlertTriangle,
  sick: ActivitySquare,
};

const DASHBOARD_STALE_TIME = 60 * 1000;
const DASHBOARD_GC_TIME = 5 * 60 * 1000;

const Overview = () => {
  const navigate = useNavigate();
  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "overview", "general"],
    queryFn: ({ signal }) =>
      googleSheetsApi.getDashboardData(
        {
          targetGroup: "general",
        },
        { signal }
      ),
    staleTime: DASHBOARD_STALE_TIME,
    gcTime: DASHBOARD_GC_TIME,
  });

  const data = dashboardQuery.data;
  const availability = data?.availability;

  const { isInitialLoading: showInitialLoading, isRefreshing: showRefreshing } =
    getCombinedQueryState([dashboardQuery]);
  const isError = dashboardQuery.isError;

  const stats: DashboardStatsCard[] = useMemo(() => {
    if (data?.stats && data.stats.length > 0) {
      return data.stats;
    }
    if (!data) {
      return [
        {
          key: "total",
          title: "จำนวนทั้งหมด",
          value: 0,
          percentage: 100,
          variant: "default",
        },
        {
          key: "normal",
          title: "ปกติ",
          value: 0,
          percentage: 0,
          variant: "success",
        },
        {
          key: "risk",
          title: "เสี่ยง",
          value: 0,
          percentage: 0,
          variant: "warning",
        },
        {
          key: "sick",
          title: "ป่วย",
          value: 0,
          percentage: 0,
          variant: "destructive",
        },
      ];
    }
    return data.stats;
  }, [data]);

  const districts = useMemo(
    () => (Array.isArray(data?.districts) ? data.districts : []),
    [data?.districts]
  );
  const barChartData = data?.barChart;
  const lineChartData = data?.lineChart;
  const categories = data?.categories ?? [];
  const metadata = data?.metadata;
  const defaultTargetGroup = metadata?.targetGroup ?? "general";
  const adjustments = data?.adjustments;
  const adjustmentSummary: DashboardAdjustmentSummary | undefined =
    adjustments?.summary;
  const latestAdjustmentEntry =
    adjustments?.latestEntry ?? adjustmentSummary?.latestEntry;

  type SummaryMetricKey = "total" | "normal" | "risk" | "sick";

  const adjustmentCategoryMap = useMemo(() => {
    const categoryList = adjustments?.categories ?? [];
    return new Map<string, DashboardAdjustmentCategorySummary>(
      categoryList.map((item) => [item.key, item])
    );
  }, [adjustments?.categories]);

  const formatNumber = (value: number | undefined | null) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value.toLocaleString();
    }
    return "-";
  };

  const formatDeltaValue = (value: number | undefined | null) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return "-";
    }
    if (value === 0) {
      return "±0";
    }
    const sign = value > 0 ? "+" : "";
    return `${sign}${Math.trunc(value).toLocaleString()}`;
  };

  const formatWithUnit = (
    value: number | undefined | null,
    unit: string = "คน"
  ) => {
    const formatted = formatNumber(value);
    if (formatted === "-") {
      return "-";
    }
    return `${formatted} ${unit}`;
  };

  const formatDeltaWithUnit = (
    value: number | undefined | null,
    unit: string = "คน"
  ) => {
    const formatted = formatDeltaValue(value);
    if (formatted === "-") {
      return "-";
    }
    return `${formatted} ${unit}`;
  };

  const toneClassName = (
    tone: "default" | "muted" | "success" | "warning" | "destructive"
  ) => {
    switch (tone) {
      case "success":
        return "text-success";
      case "warning":
        return "text-warning";
      case "destructive":
        return "text-destructive";
      case "muted":
        return "text-muted-foreground";
      default:
        return "text-foreground";
    }
  };

  const formatTimestamp = (value?: string | Date | null) => {
    if (!value) {
      return "ไม่พบข้อมูลเวลา";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "ไม่พบข้อมูลเวลา";
    }
    return new Intl.DateTimeFormat("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatAdjustmentLocation = (entry: typeof latestAdjustmentEntry) => {
    if (!entry) {
      return "ไม่พบข้อมูลพื้นที่";
    }
    const parts = [
      entry.district,
      entry.subdistrict,
      entry.village,
      entry.moo ? `หมู่ที่ ${entry.moo}` : undefined,
    ]
      .filter((item): item is string => Boolean(item && item.trim()));

    return parts.length > 0 ? parts.join(" · ") : "ไม่พบข้อมูลพื้นที่";
  };

  const getDeltaTrend = (key: SummaryMetricKey, value: number | undefined) => {
    if (typeof value !== "number" || !Number.isFinite(value) || value === 0) {
      return "neutral" as const;
    }
    if (key === "normal") {
      return value >= 0 ? ("up" as const) : ("down" as const);
    }
    if (key === "total") {
      return value >= 0 ? ("up" as const) : ("down" as const);
    }
    return value >= 0 ? ("up" as const) : ("down" as const);
  };

  const getDetailTone = (key: SummaryMetricKey, value: number | undefined) => {
    if (typeof value !== "number" || !Number.isFinite(value) || value === 0) {
      return "muted" as const;
    }
    if (key === "normal") {
      return value >= 0 ? ("success" as const) : ("destructive" as const);
    }
    if (key === "total") {
      return value >= 0 ? ("success" as const) : ("destructive" as const);
    }
    return value >= 0 ? ("warning" as const) : ("success" as const);
  };

  const latestAdjustmentOverviewDiff = useMemo(() => {
    if (!latestAdjustmentEntry?.diff) {
      return null;
    }
    const overviewDiff =
      latestAdjustmentEntry.diff.Overview ??
      latestAdjustmentEntry.diff.overview ??
      latestAdjustmentEntry.diff.Total ??
      latestAdjustmentEntry.diff.total;
    if (!overviewDiff) {
      return null;
    }
    const normal = Number(overviewDiff.normal ?? 0);
    const risk = Number(overviewDiff.risk ?? 0);
    const sick = Number(overviewDiff.sick ?? 0);
    const total = normal + risk + sick;
    return {
      normal,
      risk,
      sick,
      total,
    };
  }, [latestAdjustmentEntry]);

  const handleDrillToDetail = (params: {
    targetGroup?: string;
    district?: string;
    subdistrict?: string;
    village?: string;
    year?: string;
    month?: string;
  }) => {
    const searchParams = new URLSearchParams();
    const targetGroup = params.targetGroup ?? defaultTargetGroup ?? "general";
    if (targetGroup) {
      searchParams.set("targetGroup", targetGroup);
    }
    if (params.district) {
      searchParams.set("district", params.district);
    }
    if (params.subdistrict) {
      searchParams.set("subdistrict", params.subdistrict);
    }
    if (params.village) {
      searchParams.set("village", params.village);
    }
    if (params.year) {
      searchParams.set("year", params.year);
    }
    if (params.month) {
      searchParams.set("month", params.month);
    }

    const queryString = searchParams.toString();
    navigate(queryString ? `/detail?${queryString}` : "/detail");
  };
  const summary = data?.summary;
  const adjustedSummary = adjustmentSummary?.adjusted;
  const baselineSummary = adjustmentSummary?.baseline;
  const diffSummary = adjustmentSummary?.diff;

  const toSafeNumber = (value: unknown): number =>
    typeof value === "number" && Number.isFinite(value) ? value : 0;
  const clampNonNegative = (value: number): number =>
    value < 0 ? 0 : value;

  const baselineSummaryValues = useMemo(() => {
    const values: Record<SummaryMetricKey, number> = {
      normal: clampNonNegative(
        toSafeNumber(baselineSummary?.normal ?? summary?.normal)
      ),
      risk: clampNonNegative(
        toSafeNumber(baselineSummary?.risk ?? summary?.risk)
      ),
      sick: clampNonNegative(
        toSafeNumber(baselineSummary?.sick ?? summary?.sick)
      ),
      total: clampNonNegative(
        toSafeNumber(baselineSummary?.total ?? summary?.total)
      ),
    };
    return values;
  }, [baselineSummary?.normal, baselineSummary?.risk, baselineSummary?.sick, baselineSummary?.total, summary?.normal, summary?.risk, summary?.sick, summary?.total]);

  const diffSummaryValues = useMemo(() => {
    const values: Record<SummaryMetricKey, number> = {
      normal: toSafeNumber(
        diffSummary?.normal ??
          (adjustedSummary?.normal ?? summary?.normal ?? 0) -
            (baselineSummary?.normal ?? summary?.normal ?? 0)
      ),
      risk: toSafeNumber(
        diffSummary?.risk ??
          (adjustedSummary?.risk ?? summary?.risk ?? 0) -
            (baselineSummary?.risk ?? summary?.risk ?? 0)
      ),
      sick: toSafeNumber(
        diffSummary?.sick ??
          (adjustedSummary?.sick ?? summary?.sick ?? 0) -
            (baselineSummary?.sick ?? summary?.sick ?? 0)
      ),
      total: toSafeNumber(
        diffSummary?.total ??
          (adjustedSummary?.total ?? summary?.total ?? 0) -
            (baselineSummary?.total ?? summary?.total ?? 0)
      ),
    };
    return values;
  }, [adjustedSummary?.normal, adjustedSummary?.risk, adjustedSummary?.sick, adjustedSummary?.total, baselineSummary?.normal, baselineSummary?.risk, baselineSummary?.sick, baselineSummary?.total, diffSummary?.normal, diffSummary?.risk, diffSummary?.sick, diffSummary?.total, summary?.normal, summary?.risk, summary?.sick, summary?.total]);

  const adjustedSummaryValues = useMemo(() => {
    const values: Record<SummaryMetricKey, number> = {
      normal: clampNonNegative(
        baselineSummaryValues.normal + diffSummaryValues.normal
      ),
      risk: clampNonNegative(
        baselineSummaryValues.risk + diffSummaryValues.risk
      ),
      sick: clampNonNegative(
        baselineSummaryValues.sick + diffSummaryValues.sick
      ),
      total: clampNonNegative(
        baselineSummaryValues.total + diffSummaryValues.total
      ),
    };
    return values;
  }, [baselineSummaryValues, diffSummaryValues]);

  const adjustmentSummaryRows = useMemo(() => {
    if (!adjustmentSummary) {
      return [];
    }
    const keys: Array<{ key: SummaryMetricKey; label: string }> = [
      { key: "normal", label: "ปกติ" },
      { key: "risk", label: "เสี่ยง" },
      { key: "sick", label: "ป่วย" },
      { key: "total", label: "รวม" },
    ];
    return keys.map((item) => {
      const baseline = clampNonNegative(
        toSafeNumber(
          adjustmentSummary.baseline?.[
            item.key as keyof DashboardAdjustmentSummary["baseline"]
          ] ??
            (item.key === "total"
              ? baselineSummaryValues.total
              : baselineSummaryValues[item.key])
        )
      );
      const diff = toSafeNumber(
        adjustmentSummary.diff?.[
          item.key as keyof DashboardAdjustmentSummary["diff"]
        ] ??
          (item.key === "total"
            ? diffSummaryValues.total
            : diffSummaryValues[item.key])
      );
      const adjusted = clampNonNegative(baseline + diff);
      return {
        ...item,
        baseline,
        adjusted,
        diff,
      };
    });
  }, [adjustmentSummary, baselineSummaryValues, diffSummaryValues]);

  const total = adjustedSummaryValues.total;
  const riskPercent = total ? adjustedSummaryValues.risk / total : 0;
  const sickPercent = total ? adjustedSummaryValues.sick / total : 0;
  const normalPercent = total ? adjustedSummaryValues.normal / total : 0;

  const periodLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    availability?.periods.forEach((item) => map.set(item.key, item.label));
    return map;
  }, [availability?.periods]);

  const latestPeriodLabel =
    metadata?.period ?? periodLabelMap.values().next().value ?? "ทั้งหมด";

  const topRiskDistrict = useMemo(() => {
    if (!districts.length) {
      return undefined;
    }
    return [...districts].sort((a, b) => b.risk - a.risk)[0];
  }, [districts]);

  const highestSickRatioDistrict = useMemo(() => {
    if (!districts.length) {
      return undefined;
    }
    return [...districts]
      .map((district) => ({
        name: district.name ?? district.id ?? "ไม่ระบุ",
        ratio: district.total ? district.sick / district.total : 0,
        sick: district.sick,
      }))
      .sort((a, b) => b.ratio - a.ratio)[0];
  }, [districts]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8 space-y-8">
        <section className="text-center space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            ภาพรวม NCDs Prevention
          </h2>
          <div className="flex justify-center gap-2">
            <Badge variant="outline">
              <Sparkles className="mr-1 h-3 w-3" />
              ข้อมูลรวมจังหวัด | อัปเดต {latestPeriodLabel}
            </Badge>
            <Badge variant="outline">
              <CalendarClock className="mr-1 h-3 w-3" />
              สรุปจากชุดข้อมูลล่าสุดของระบบ
            </Badge>
          </div>
        </section>

        {metadata?.warning && (
          <Card className="border-warning/50 bg-warning/10">
            <CardContent className="py-3 text-sm text-warning-foreground">
              {metadata.warning}
            </CardContent>
          </Card>
        )}

        {isError && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="py-3 text-sm text-destructive">
              ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง
            </CardContent>
          </Card>
        )}

        {showInitialLoading ? (
          <LoadingState message="กำลังโหลดข้อมูลภาพรวม..." />
        ) : (
          <>
            <section className="space-y-6">
              <Card className="bg-gradient-to-br from-primary/10 via-background to-accent/10 border-none shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <TrendingUp className="h-5 w-5" />
                    ตัวชี้วัดสำคัญ
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-lg border bg-background/70 p-4 text-center">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      ปกติ
                    </p>
                    <p className="text-3xl font-semibold text-success mt-2">
                      {(normalPercent * 100).toFixed(1)}%
                    </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {adjustedSummaryValues.normal.toLocaleString()} คน
                    </p>
                  </div>
                  <div className="rounded-lg border bg-background/70 p-4 text-center">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      กลุ่มเสี่ยง
                    </p>
                    <p className="text-3xl font-semibold text-warning mt-2">
                      {(riskPercent * 100).toFixed(1)}%
                    </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {adjustedSummaryValues.risk.toLocaleString()} คน
                    </p>
                  </div>
                  <div className="rounded-lg border bg-background/70 p-4 text-center">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      ป่วย
                    </p>
                    <p className="text-3xl font-semibold text-destructive mt-2">
                      {(sickPercent * 100).toFixed(1)}%
                    </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {adjustedSummaryValues.sick.toLocaleString()} คน
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => {
                  const IconComponent =
                    iconMap[stat.key as keyof typeof iconMap] ?? Users;
                  const adjustedValue =
                    stat.key === "total"
                      ? adjustedSummaryValues.total
                      : adjustedSummaryValues[stat.key as SummaryMetricKey] ??
                        stat.value;
                  const formattedValue = adjustedValue.toLocaleString();
                  const formattedPercentage =
                    stat.key === "total"
                      ? "100%"
                      : `${stat.percentage.toFixed(1)}%`;
                  const metricKey: SummaryMetricKey =
                    stat.key === "total"
                      ? "total"
                      : (stat.key as SummaryMetricKey);
                  const baselineValue =
                    metricKey === "total"
                      ? baselineSummaryValues.total
                      : baselineSummaryValues[metricKey];
                  const diffValue =
                    metricKey === "total"
                      ? diffSummaryValues.total
                      : diffSummaryValues[metricKey];
                  const details: Array<{
                    label: string;
                    value: string;
                    tone?: "default" | "muted" | "success" | "warning" | "destructive";
                  }> = [];
                  if (
                    typeof baselineValue === "number" &&
                    Number.isFinite(baselineValue)
                  ) {
                    details.push({
                      label: "ก่อนปรับ",
                      value: formatWithUnit(baselineValue),
                      tone: "muted" as const,
                    });
                  }
                  if (
                    typeof diffValue === "number" &&
                    Number.isFinite(diffValue)
                  ) {
                    details.push({
                      label: "เปลี่ยนแปลง",
                      value: formatDeltaWithUnit(diffValue),
                      tone: getDetailTone(metricKey, diffValue),
                    });
                  }

                  return (
                    <StatsCard
                      key={stat.key}
                      title={stat.title}
                      value={formattedValue}
                      percentage={formattedPercentage}
                      icon={IconComponent}
                      variant={stat.variant}
                      details={details}
                      delta={
                        typeof diffValue === "number" && Number.isFinite(diffValue)
                          ? {
                              value: formatDeltaWithUnit(diffValue),
                              trend: getDeltaTrend(metricKey, diffValue),
                              label: "เทียบก่อนปรับ",
                            }
                          : undefined
                      }
                    />
                  );
                })}
              </div>

              {adjustmentSummary ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex flex-col gap-1">
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-primary" />
                        ผลหลังการปรับยอด
                      </span>
                      <span className="text-sm font-normal text-muted-foreground">
                        เทียบข้อมูลก่อนและหลังการบันทึกปรับยอดล่าสุด
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {adjustmentSummaryRows.map((row) => {
                      const tone = getDetailTone(row.key, row.diff);
                      return (
                        <div
                          key={row.key}
                          className="rounded-lg border bg-background/70 p-3 space-y-2"
                        >
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            {row.label}
                          </p>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">ก่อนปรับ</span>
                              <span className="font-medium">
                                {formatWithUnit(row.baseline)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">หลังปรับ</span>
                              <span className="font-semibold text-primary">
                                {formatWithUnit(row.adjusted)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">เปลี่ยนแปลง</span>
                              <span className={`font-semibold ${toneClassName(tone)}`}>
                                {formatDeltaWithUnit(row.diff)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ) : null}

              {latestAdjustmentEntry ? (
                <Card className="border-dashed border-primary/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex flex-col gap-1">
                      <span className="flex items-center gap-2">
                        <History className="h-4 w-4 text-primary" />
                        การปรับยอดล่าสุด
                      </span>
                      <span className="text-sm font-normal text-muted-foreground">
                        {formatTimestamp(latestAdjustmentEntry.createdAt)}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex flex-wrap gap-2">
                      {latestAdjustmentEntry.createdBy ? (
                        <Badge variant="secondary">
                          ผู้บันทึก {latestAdjustmentEntry.createdBy}
                        </Badge>
                      ) : null}
                      {latestAdjustmentEntry.targetGroup ? (
                        <Badge variant="outline">
                          กลุ่ม {latestAdjustmentEntry.targetGroup}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        เหตุผลการปรับ
                      </p>
                      <p className="text-base font-medium leading-relaxed">
                        {latestAdjustmentEntry.reason?.trim() || "ไม่ระบุเหตุผล"}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          พื้นที่ที่ได้รับการปรับ
                        </p>
                        <p className="mt-1 font-medium">
                          {formatAdjustmentLocation(latestAdjustmentEntry)}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          ผลต่างเชิงยอดรวม
                        </p>
                        {latestAdjustmentOverviewDiff ? (
                          <ul className="mt-1 space-y-1">
                            <li className="flex items-center justify-between">
                              <span className="text-muted-foreground">รวม</span>
                              <span className={`font-semibold ${toneClassName(getDetailTone("total", latestAdjustmentOverviewDiff.total))}`}>
                                {formatDeltaWithUnit(latestAdjustmentOverviewDiff.total)}
                              </span>
                            </li>
                            <li className="flex items-center justify-between">
                              <span className="text-muted-foreground">ปกติ</span>
                              <span className={`font-semibold ${toneClassName(getDetailTone("normal", latestAdjustmentOverviewDiff.normal))}`}>
                                {formatDeltaWithUnit(latestAdjustmentOverviewDiff.normal)}
                              </span>
                            </li>
                            <li className="flex items-center justify-between">
                              <span className="text-muted-foreground">เสี่ยง</span>
                              <span className={`font-semibold ${toneClassName(getDetailTone("risk", latestAdjustmentOverviewDiff.risk))}`}>
                                {formatDeltaWithUnit(latestAdjustmentOverviewDiff.risk)}
                              </span>
                            </li>
                            <li className="flex items-center justify-between">
                              <span className="text-muted-foreground">ป่วย</span>
                              <span className={`font-semibold ${toneClassName(getDetailTone("sick", latestAdjustmentOverviewDiff.sick))}`}>
                                {formatDeltaWithUnit(latestAdjustmentOverviewDiff.sick)}
                              </span>
                            </li>
                          </ul>
                        ) : (
                          <p className="mt-1 text-muted-foreground">
                            ไม่มีข้อมูลเปรียบเทียบเชิงยอดรวม
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {showRefreshing && (
                <p className="text-sm text-muted-foreground text-center">
                  กำลังอัปเดตข้อมูลล่าสุด...
                </p>
              )}
            </section>

            <Separator />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>แนวโน้มข้อมูลตามช่วงเวลา</CardTitle>
                </CardHeader>
                <CardContent>
                  {lineChartData && lineChartData.labels.length > 0 ? (
                    <LineChart data={lineChartData} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      ไม่มีข้อมูลแนวโน้มสำหรับแสดงผล
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>สัดส่วนสถานะปัจจุบัน</CardTitle>
                </CardHeader>
                <CardContent>
                  {barChartData ? (
                    <BarChart data={barChartData} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      ไม่มีข้อมูลสำหรับแสดงกราฟนี้
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Separator />

            <section>
              <Card className="h-full">
                <CardHeader className="pb-4 space-y-1">
                  <CardTitle className="flex flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <ActivitySquare className="w-5 h-5 text-primary" />
                      สถานการณ์เชิงพื้นที่
                    </span>
                    <span className="text-sm font-normal text-muted-foreground">
                      คลิกที่อำเภอเพื่อเจาะลึกข้อมูลในหน้ารายละเอียด
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border bg-muted/30 p-3">
                    {districts.length > 0 ? (
                      <HeatMap
                        districts={districts}
                        onSelectDistrict={(district) =>
                          handleDrillToDetail({
                            targetGroup: defaultTargetGroup,
                            district: district.name ?? district.id,
                          })
                        }
                      />
                    ) : (
                      <div className="text-center text-sm text-muted-foreground py-10">
                        ไม่มีข้อมูลสำหรับแสดงผล
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border bg-background/80 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        จำนวนทั้งหมด
                      </p>
                      <p className="mt-1 text-base font-semibold text-primary">
                        {adjustedSummaryValues.total.toLocaleString()} คน
                      </p>
                      {Number.isFinite(diffSummaryValues.total) ? (
                        <p
                          className={`text-xs font-semibold ${toneClassName(
                            getDetailTone("total", diffSummaryValues.total)
                          )}`}
                        >
                          {formatDeltaWithUnit(diffSummaryValues.total)}
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

            <section className="space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h3 className="text-lg font-semibold">ข้อมูลสรุปตามหมวดหมู่</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categories
                  .filter((item) => item.key !== "Overview")
                  .map((item) => {
                    const safeNormal = clampNonNegative(toSafeNumber(item.normal));
                    const safeRisk = clampNonNegative(toSafeNumber(item.risk));
                    const safeSick = clampNonNegative(toSafeNumber(item.sick));
                    const totalCategory = clampNonNegative(
                      toSafeNumber(item.total ?? safeNormal + safeRisk + safeSick)
                    );
                    const normalShare = totalCategory
                      ? (safeNormal / totalCategory) * 100
                      : 0;
                    const riskShare = totalCategory
                      ? (safeRisk / totalCategory) * 100
                      : 0;
                    const sickShare = totalCategory
                      ? (safeSick / totalCategory) * 100
                      : 0;
                    const adjustmentCategory = adjustmentCategoryMap.get(item.key);
                    const baselineTotal = clampNonNegative(
                      toSafeNumber(
                        adjustmentCategory?.baseline.total ??
                          totalCategory - toSafeNumber(adjustmentCategory?.diff.total ?? 0)
                      )
                    );
                    const diffTotal = toSafeNumber(adjustmentCategory?.diff.total ?? 0);
                    const adjustedTotal = clampNonNegative(baselineTotal + diffTotal);

                    return (
                      <Card
                        key={item.name}
                        className="hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-4 space-y-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                              {item.name}
                            </p>
                            <p className="text-2xl font-bold text-primary mt-1">
                              {totalCategory.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.unit ?? "คน"}
                            </p>
                          </div>

                          <div className="space-y-3 text-xs">
                            <div className="rounded-md border bg-success/10 p-3">
                            <div className="flex items-baseline justify-between text-success font-semibold">
                              <span>ปกติ</span>
                              <span>{normalShare.toFixed(1)}%</span>
                            </div>
                            <div className="mt-1 flex justify-between text-success/80 font-medium">
                              <span>จำนวน</span>
                              <span>{safeNormal.toLocaleString()} คน</span>
                            </div>
                          </div>
                          <div className="rounded-md border bg-warning/10 p-3">
                            <div className="flex items-baseline justify-between text-warning font-semibold">
                              <span>เสี่ยง</span>
                              <span>{riskShare.toFixed(1)}%</span>
                            </div>
                            <div className="mt-1 flex justify-between text-warning/80 font-medium">
                              <span>จำนวน</span>
                              <span>{safeRisk.toLocaleString()} คน</span>
                            </div>
                          </div>
                          <div className="rounded-md border bg-destructive/10 p-3">
                            <div className="flex items-baseline justify-between text-destructive font-semibold">
                              <span>ป่วย</span>
                              <span>{sickShare.toFixed(1)}%</span>
                            </div>
                            <div className="mt-1 flex justify-between text-destructive/80 font-medium">
                              <span>จำนวน</span>
                              <span>{safeSick.toLocaleString()} คน</span>
                            </div>
                          </div>
                          </div>
                          {adjustmentCategory ? (
                            <div className="rounded-md border border-dashed bg-muted/10 p-3 space-y-1 text-xs">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                เปรียบเทียบหลังปรับ
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">ก่อนปรับ</span>
                                <span className="font-medium">
                                  {formatWithUnit(baselineTotal, item.unit ?? "คน")}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">เปลี่ยนแปลง</span>
                                <span
                                  className={`font-semibold ${toneClassName(
                                    getDetailTone("total", diffTotal)
                                  )}`}
                                >
                                  {formatDeltaWithUnit(diffTotal, item.unit ?? "คน")}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">หลังปรับ</span>
                                <span className="font-semibold text-primary">
                                  {formatWithUnit(adjustedTotal, item.unit ?? "คน")}
                                </span>
                              </div>
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="border-t mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground space-y-2">
          <p>ระบบจัดการข้อมูล NCDs จังหวัดแพร่</p>
          <p>สาธารณสุขอำเภอ</p>
        </div>
      </footer>
    </div>
  );
};

export default Overview;
