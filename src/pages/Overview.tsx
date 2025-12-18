import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { LoadingState } from "@/components/LoadingState";
import {
  googleSheetsApi,
  type DashboardStatsCard,
} from "@/services/googleSheetsApi";
import { getCombinedQueryState } from "@/lib/queryState";

// Components
import { OverviewHero } from "./overview-components/OverviewHero";
import { DistrictRiskHeatmap } from "./overview-components/DistrictRiskHeatmap";
import { DistrictListItem } from "./overview-components/DistrictListItem";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AlertCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Overview = () => {
  const navigate = useNavigate();

  // 1. Fetch Main Data
  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "overview", "general"],
    queryFn: ({ signal }) =>
      googleSheetsApi.getDashboardData({
        targetGroup: "general",
      }),
  });

  const data = dashboardQuery.data;
  const { isInitialLoading, isRefreshing } = getCombinedQueryState([
    dashboardQuery,
  ]);
  const isError = dashboardQuery.isError;

  // 2. Prepare Data for Hero
  const stats: DashboardStatsCard[] = useMemo(() => {
    if (data?.stats && data.stats.length > 0) return data.stats;
    return [];
  }, [data]);

  const summary = data?.summary;
  const totalPop = summary?.total || 0;

  // Calculate "Health Score" (Simple heuristic: % Normal / Total * 100)
  // This is a mock score for demo purposes, can be refined with weighted logic
  const healthScore = useMemo(() => {
    if (!totalPop) return 0;
    const normal = summary?.normal || 0;
    // Boost score slightly for demo "Executive View" ensuring it's not too depressing if data is raw
    return Math.min(100, (normal / totalPop) * 100);
  }, [summary, totalPop]);

  // 3. Prepare Data for Heatmap & rankings
  // 3. Prepare Data for Heatmap & rankings
  const districts = useMemo(
    () => (Array.isArray(data?.districts) ? data.districts : []),
    [data?.districts]
  );

  const detailTable = data?.detailTable || [];

  // Identify "Areas Needing Support" (High Risk)
  const areasNeedingSupport = useMemo(() => {
    return [...districts]
      .sort((a, b) => b.risk - a.risk) // Sort by highest risk count/ratio
      .slice(0, 3);
  }, [districts]);

  // Identify "Model Communities" (High Normal Ratio)
  const modelCommunities = useMemo(() => {
    return [...districts].sort((a, b) => b.normal - a.normal).slice(0, 3);
  }, [districts]);

  // Count Critical Alerts (Districts with > 20% Risk - visual threshold)
  // Filter Critical Alerts (Districts with > 20% Risk - visual threshold)
  const criticalDistricts = districts.filter((d) => {
    const t = d.normal + d.risk + d.sick;
    return t > 0 && d.risk / t >= 0.2;
  });

  // 4. Trend Calculation (Month-over-Month)
  const comparisonStats = useMemo(() => {
    if (!detailTable || detailTable.length === 0) return null;

    // Detect latest 2 months
    const periods = Array.from(
      new Set(
        detailTable
          .filter((r) => r.year && r.month)
          .map((r) => `${r.year}-${String(r.month).padStart(2, "0")}`)
      )
    )
      .sort()
      .reverse(); // Descending [2025-02, 2025-01, ...]

    if (periods.length < 2) return null;

    const currentPeriod = periods[0];
    const prevPeriod = periods[1];

    const currentData = detailTable.filter(
      (r) => `${r.year}-${String(r.month).padStart(2, "0")}` === currentPeriod
    );
    const prevData = detailTable.filter(
      (r) => `${r.year}-${String(r.month).padStart(2, "0")}` === prevPeriod
    );

    // Calc Totals
    const calc = (rows: typeof detailTable) => {
      return rows.reduce(
        (acc, r) => ({
          screened: acc.screened + (r.normal + r.risk + r.sick),
          risk: acc.risk + r.risk,
        }),
        { screened: 0, risk: 0 }
      );
    };

    const current = calc(currentData);
    const prev = calc(prevData);

    const getPctChange = (curr: number, old: number) => {
      if (old === 0) return 0;
      return ((curr - old) / old) * 100;
    };

    return {
      periodLabel: `เทียบกับเดือนก่อนหน้า (${prevPeriod})`,
      screenedChange: getPctChange(current.screened, prev.screened),
      riskChange: getPctChange(current.risk, prev.risk),
    };
  }, [detailTable]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <Navigation />

      <main className="container mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header Context */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              NCDs Prevention Center
            </h1>
            <p className="text-slate-500 mt-1">
              ภาพรวมระบบ • การเฝ้าระวังโรคไม่ติดต่อเรื้อรัง จังหวัดแพร่
            </p>
          </div>
          <div className="text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-lg shadow-sm border">
            ข้อมูลประจำปีงบประมาณ:{" "}
            <span className="font-bold text-slate-700">
              {data?.metadata?.period || new Date().getFullYear() + 543}
            </span>
          </div>
        </div>

        {isError && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg text-center">
            ข้อผิดพลาดระบบ: ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ
          </div>
        )}

        {isInitialLoading ? (
          <LoadingState message="กำลังโหลดข้อมูล..." />
        ) : (
          <>
            {/* 1. Hero Section: Executive Scorecard */}
            <OverviewHero
              stats={stats}
              healthScore={healthScore}
              totalPopulation={totalPop}
              criticalDistricts={criticalDistricts}
              comparisonStats={comparisonStats}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 2. Strategic Map (Heatmap) - Takes 2/3 width */}
              <div className="lg:col-span-2 space-y-6">
                <DistrictRiskHeatmap districts={districts} />
              </div>

              {/* 3. Strategic Prioritization (Side Panel) */}
              <div className="space-y-6">
                {/* Red Zone: Areas Needing Support */}
                <Card className="border-l-4 border-l-orange-500 shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
                      <AlertCircle className="h-5 w-5" />
                      พื้นที่ที่น่าเป็นห่วง (Monitor)
                    </CardTitle>
                    <CardDescription>
                      พื้นที่ที่มีสัดส่วนกลุ่มเสี่ยงสูง
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {areasNeedingSupport.map((d, i) => (
                      <DistrictListItem
                        key={d.name}
                        district={d}
                        index={i}
                        type="monitor"
                        detailRows={detailTable}
                      />
                    ))}
                  </CardContent>
                </Card>

                {/* Green Zone: Model Communities */}
                <Card className="border-l-4 border-l-emerald-500 shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2 text-emerald-700">
                      <Star className="h-5 w-5" />
                      พื้นที่ต้นแบบ (Model Communities)
                    </CardTitle>
                    <CardDescription>
                      พื้นที่จัดการสุขภาพได้ดีเยี่ยม
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {modelCommunities.map((d, i) => (
                      <DistrictListItem
                        key={d.name}
                        district={d}
                        index={i}
                        type="model"
                        detailRows={detailTable}
                      />
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Overview;
