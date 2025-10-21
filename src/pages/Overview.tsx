﻿import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { HeatMap } from "@/components/HeatMap";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  googleSheetsApi,
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
    queryFn: () =>
      googleSheetsApi.getDashboardData({
        targetGroup: "general",
      }),
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

  const districts = data?.districts ?? [];
  const barChartData = data?.barChart;
  const lineChartData = data?.lineChart;
  const categories = data?.categories ?? [];
  const metadata = data?.metadata;
  const defaultTargetGroup = metadata?.targetGroup ?? "general";

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

  const total = summary?.total ?? 0;
  const riskPercent = total ? (summary?.risk ?? 0) / total : 0;
  const sickPercent = total ? (summary?.sick ?? 0) / total : 0;
  const normalPercent = total ? (summary?.normal ?? 0) / total : 0;

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
                      {summary?.normal?.toLocaleString() ?? 0} คน
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
                      {summary?.risk?.toLocaleString() ?? 0} คน
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
                      {summary?.sick?.toLocaleString() ?? 0} คน
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => {
                  const IconComponent =
                    iconMap[stat.key as keyof typeof iconMap] ?? Users;
                  const formattedValue = stat.value.toLocaleString();
                  const formattedPercentage =
                    stat.key === "total"
                      ? "100%"
                      : `${stat.percentage.toFixed(1)}%`;

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
                        {total.toLocaleString()} คน
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
                    const totalCategory = item.total || 0;
                    const normalShare = totalCategory
                      ? (item.normal / totalCategory) * 100
                      : 0;
                    const riskShare = totalCategory
                      ? (item.risk / totalCategory) * 100
                      : 0;
                    const sickShare = totalCategory
                      ? (item.sick / totalCategory) * 100
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
                                <span>{(item.normal ?? 0).toLocaleString()} คน</span>
                              </div>
                            </div>
                            <div className="rounded-md border bg-warning/10 p-3">
                              <div className="flex items-baseline justify-between text-warning font-semibold">
                                <span>เสี่ยง</span>
                                <span>{riskShare.toFixed(1)}%</span>
                              </div>
                              <div className="mt-1 flex justify-between text-warning/80 font-medium">
                                <span>จำนวน</span>
                                <span>{(item.risk ?? 0).toLocaleString()} คน</span>
                              </div>
                            </div>
                            <div className="rounded-md border bg-destructive/10 p-3">
                              <div className="flex items-baseline justify-between text-destructive font-semibold">
                                <span>ป่วย</span>
                                <span>{sickShare.toFixed(1)}%</span>
                              </div>
                              <div className="mt-1 flex justify-between text-destructive/80 font-medium">
                                <span>จำนวน</span>
                                <span>{(item.sick ?? 0).toLocaleString()} คน</span>
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
