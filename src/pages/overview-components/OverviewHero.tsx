import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Users,
  AlertTriangle,
  HeartPulse,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  DashboardStatsCard,
  DashboardDistrict,
} from "@/services/googleSheetsApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OverviewHeroProps {
  stats: DashboardStatsCard[];
  healthScore: number; // 0-100
  totalPopulation: number;
  criticalDistricts: DashboardDistrict[];
  comparisonStats?: {
    periodLabel: string;
    screenedChange: number;
    riskChange: number;
  } | null;
}

export function OverviewHero({
  stats,
  healthScore, // This is essentially normal %
  totalPopulation,
  criticalDistricts,
  comparisonStats,
}: OverviewHeroProps) {
  const navigate = useNavigate();

  // Find specific stats for display logic
  const riskStat = stats.find((s) => s.key === "risk");
  const sickStat = stats.find((s) => s.key === "sick");

  // Data Correction: Use Total Screened Count directly (Activity Volume)
  const screenedCount = stats.find((s) => s.key === "total")?.value || 0;

  // Calculate percentages for Stacked Bar if total > 0, else 0
  // Note: healthScore passed in is (normal/total)*100
  const normalPct = healthScore;
  const riskPct = riskStat?.percentage || 0;
  // Calculate sick pct as remainder or strict calculation if value exists
  const sickPct = sickStat?.percentage || 100 - normalPct - riskPct;

  const renderTrend = (pctChange: number) => {
    if (pctChange === 0) return null;
    const isPositive = pctChange > 0;
    const Icon = isPositive ? ArrowRight : ArrowRight; // Typically arrows up/down logic
    // For Screened: More is usually good (Active). For Risk: More is bad.
    // Let's stick to neutral mathematical change for now
    return (
      <span
        className={`ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-1 w-fit ${
          isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}
      >
        {isPositive ? "+" : ""}
        {pctChange.toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
      {/* 1. Health Proportion (Stacked Bar) - CLARIFIED LOGIC */}
      <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-indigo-100 flex items-center gap-2">
            สัดส่วนสุขภาพประชากร (Health Dist.)
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-indigo-300" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>สัดส่วน: ปกติ (เขียว) / เสี่ยง (ส้ม) / ป่วย (แดง)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
          <HeartPulse className="h-4 w-4 text-indigo-200" />
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{normalPct.toFixed(0)}%</div>
          <p className="text-xs text-indigo-100 mt-1 flex items-center">
            ประชากรกลุ่มปกติ (สุขภาพดี)
          </p>

          {/* Stacked Progress Bar */}
          <div className="mt-4 h-2 w-full bg-black/20 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-emerald-400"
              style={{ width: `${normalPct}%` }}
              title={`ปกติ ${normalPct.toFixed(1)}%`}
            />
            <div
              className="h-full bg-orange-400"
              style={{ width: `${riskPct}%` }}
              title={`เสี่ยง ${riskPct.toFixed(1)}%`}
            />
            <div
              className="h-full bg-red-400"
              style={{ width: `${Math.max(0, 100 - normalPct - riskPct)}%` }} // Fill remainder
              title={`ป่วย`}
            />
          </div>

          {/* Legend */}
          <div className="flex justify-between items-center mt-2 text-[10px] text-indigo-200 opacity-80">
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
              ปกติ
            </span>
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
              เสี่ยง
            </span>
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>ป่วย
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Screening Activity (Total Screened) */}
      <Card className="border-l-4 border-l-blue-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-500">
            จำนวนผู้ได้รับการคัดกรองสะสม
          </CardTitle>
          <Users className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-slate-800">
              {screenedCount.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400">ราย (สะสม)</div>
            {comparisonStats && renderTrend(comparisonStats.screenedChange)}
          </div>
          <div className="flex items-center mt-2 text-xs text-slate-500">
            <span className="text-slate-400">
              {comparisonStats?.periodLabel || "ข้อมูลจากระบบล่าสุด"}
            </span>
          </div>
          {/* <div className="mt-3 text-xs text-slate-500">ข้อมูลล่าสุดจากระบบ</div> */}
        </CardContent>
      </Card>

      {/* 3. Risk Momentum */}
      <Card className="border-l-4 border-l-amber-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-500">
            แนวโน้มกลุ่มเสี่ยง
          </CardTitle>
          <Activity className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            {(riskStat?.percentage || 0).toFixed(1)}%
            {comparisonStats && renderTrend(comparisonStats.riskChange)}
          </div>
          <p className="text-xs text-slate-400 mt-1">สัดส่วนกลุ่มเสี่ยง</p>

          <div className="mt-4 flex items-center justify-between text-xs">
            <Badge
              variant="outline"
              className="text-amber-600 border-amber-200 bg-amber-50"
            >
              {riskStat?.value.toLocaleString()} คน
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 4. Critical Alerts (Interactive Dialog) */}
      <Dialog>
        <DialogTrigger asChild>
          <Card className="border-l-4 border-l-orange-500 shadow-sm cursor-pointer hover:bg-orange-50/50 transition-colors group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 group-hover:text-orange-700 transition-colors">
                พื้นที่ต้องเฝ้าระวัง
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600 flex items-center gap-2">
                {criticalDistricts.length}{" "}
                <span className="text-sm font-normal text-slate-500">
                  พื้นที่
                </span>
                <Info className="h-4 w-4 text-orange-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                ต้องการการสนับสนุนทันที
              </p>
              <div className="mt-4 flex justify-between items-center">
                <Badge
                  variant="outline"
                  className="text-orange-600 border-orange-200 bg-orange-50"
                >
                  คลิกเพื่อดูรายการ
                </Badge>
                <ArrowRight className="h-4 w-4 text-orange-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              พื้นที่ที่ต้องเฝ้าระวังเป็นพิเศษ
            </DialogTitle>
            <DialogDescription>
              รายการอำเภอที่มีสัดส่วนกลุ่มเสี่ยงสูงกว่า 20%
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {criticalDistricts.length > 0 ? (
              criticalDistricts.map((d) => {
                const total = d.normal + d.risk + d.sick;
                const riskPct = total > 0 ? (d.risk / total) * 100 : 0;
                return (
                  <div
                    key={d.name}
                    className="flex items-center justify-between p-3 rounded-lg border border-orange-100 bg-orange-50 hover:bg-orange-100/80 transition-colors"
                  >
                    <div>
                      <h4 className="font-bold text-slate-800">{d.name}</h4>
                      <div className="text-xs text-slate-500 mt-1">
                        กลุ่มเสี่ยง:{" "}
                        <span className="text-orange-600 font-semibold">
                          {d.risk.toLocaleString()}
                        </span>{" "}
                        คน ({riskPct.toFixed(1)}%)
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs border-orange-200 text-orange-700 hover:bg-orange-200 hover:text-orange-800"
                      onClick={() => navigate(`/detail?district=${d.name}`)}
                    >
                      ดูข้อมูล
                    </Button>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-slate-500">
                ไม่พบพื้นที่ที่ต้องเฝ้าระวัง
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
