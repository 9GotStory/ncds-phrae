import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  ActivitySquare,
  AlertTriangle,
  CalendarClock,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

import { Navigation } from "@/components/Navigation";
import { StatsCard } from "@/components/StatsCard";
import { LoadingState } from "@/components/LoadingState";

import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  googleSheetsApi,
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

const Overview = () => {
  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "overview", "general"],
    queryFn: ({ signal }) =>
      googleSheetsApi.getDashboardData({
        targetGroup: "general",
      }),
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

  type SummaryMetricKey = "total" | "normal" | "risk" | "sick";

  const summary = data?.summary;
  const adjustedSummary = adjustmentSummary?.adjusted;

  const toSafeNumber = (value: unknown): number =>
    typeof value === "number" && Number.isFinite(value) ? value : 0;
  const clampNonNegative = (value: number): number => (value < 0 ? 0 : value);

  const summaryValues = useMemo(() => {
    const source = adjustedSummary ?? summary;
    return {
      normal: clampNonNegative(toSafeNumber(source?.normal ?? 0)),
      risk: clampNonNegative(toSafeNumber(source?.risk ?? 0)),
      sick: clampNonNegative(toSafeNumber(source?.sick ?? 0)),
      total: clampNonNegative(toSafeNumber(source?.total ?? 0)),
    };
  }, [adjustedSummary, summary]);

  const total = summaryValues.total;
  const riskPercent = total ? summaryValues.risk / total : 0;
  const sickPercent = total ? summaryValues.sick / total : 0;
  const normalPercent = total ? summaryValues.normal / total : 0;

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
      .map((district) => {
        const total = district.normal + district.risk + district.sick;
        return {
          name: district.name ?? district.id ?? "ไม่ระบุ",
          ratio: total > 0 ? district.sick / total : 0,
          sick: district.sick,
        };
      })
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
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h3 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <TrendingUp className="h-4 w-4" />
                  </span>
                  การคัดกรอง
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => {
                  const IconComponent =
                    iconMap[stat.key as keyof typeof iconMap] ?? Users;
                  const metricKey: SummaryMetricKey =
                    stat.key === "total"
                      ? "total"
                      : (stat.key as SummaryMetricKey);
                  const metricValue =
                    metricKey === "total"
                      ? summaryValues.total
                      : summaryValues[metricKey] ?? stat.value;
                  const formattedValue = metricValue.toLocaleString();
                  const share =
                    total > 0
                      ? metricKey === "total"
                        ? 100
                        : (summaryValues[metricKey] / total) * 100
                      : 0;
                  const formattedPercentage =
                    metricKey === "total"
                      ? `${share.toFixed(0)}%`
                      : `${share.toFixed(1)}%`;
                  return (
                    <StatsCard
                      key={stat.key}
                      title={stat.title}
                      value={formattedValue}
                      percentage={formattedPercentage}
                      icon={IconComponent}
                      variant={stat.variant}
                    />
                  );
                })}
              </div>
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
                    (() => {
                      // Calculate total across all datasets for percentage base
                      // This assumes we want % relative to grand total, similar to how 'shares' works
                      // Or if it's a stacked bar, per column.
                      // Based on "Current Status Proportion", it's likely simplified status counts.
                      // Let's assume we want % of the specific bar's category if it's categorical,
                      // or % of grand total if it's a breakdown.
                      // Given "Normal, Risk, Sick", usually we want sum=100%.

                      // 1. Clone data to avoid mutating original
                      const percentData = JSON.parse(
                        JSON.stringify(barChartData)
                      ) as typeof barChartData;

                      // 2. Calculate percentages
                      // Strategy: For each index (column), sum the values of all datasets at that index.
                      // Then divide each value by that column's sum (Stacked 100% logic)
                      // OR: If it's a simple distribution, sum everything.
                      // Let's look at the structure. Usually datasets are [Normal, Risk, Sick].
                      // If so, labels might be "Current Period".
                      // If labels are "Districts", then we want % within that district.
                      const totalPerIndex = percentData.labels.map((_, i) =>
                        percentData.datasets.reduce(
                          (sum, dataset) => sum + (dataset.data[i] || 0),
                          0
                        )
                      );

                      percentData.datasets.forEach((dataset) => {
                        dataset.data = dataset.data.map((val, i) => {
                          const total = totalPerIndex[i];
                          return total > 0 ? (val / total) * 100 : 0;
                        });
                      });

                      const percentOptions = {
                        scales: {
                          y: {
                            ticks: {
                              callback: (value: number | string) =>
                                `${Number(value).toFixed(0)}%`,
                            },
                            max: 100, // Ensure scale goes to 100 if stacked, or auto if not.
                          },
                        },
                        plugins: {
                          tooltip: {
                            callbacks: {
                              label: (context: any) => {
                                const value = context.raw as number;
                                return `${
                                  context.dataset.label ?? ""
                                }: ${value.toFixed(1)}%`;
                              },
                            },
                          },
                        },
                      };

                      return (
                        <BarChart data={percentData} options={percentOptions} />
                      );
                    })()
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
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 text-sm">
                    <div className="rounded-lg border bg-background/80 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        จำนวนทั้งหมด
                      </p>
                      <p className="mt-1 text-base font-semibold text-primary">
                        {summaryValues.total.toLocaleString()} คน
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
                    const safeNormal = clampNonNegative(
                      toSafeNumber(item.normal)
                    );
                    const safeRisk = clampNonNegative(toSafeNumber(item.risk));
                    const safeSick = clampNonNegative(toSafeNumber(item.sick));
                    const totalCategory = clampNonNegative(
                      toSafeNumber(
                        item.total ?? safeNormal + safeRisk + safeSick
                      )
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
