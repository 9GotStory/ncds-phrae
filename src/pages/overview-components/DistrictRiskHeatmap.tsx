import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardDistrict } from "@/services/googleSheetsApi";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DistrictRiskHeatmapProps {
  districts: DashboardDistrict[];
}

export function DistrictRiskHeatmap({ districts }: DistrictRiskHeatmapProps) {
  const navigate = useNavigate();

  // Helper to determine risk level color
  const getRiskLevel = (percentage: number) => {
    if (percentage >= 20) return "high";
    if (percentage >= 10) return "medium";
    return "low";
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "high":
        return "bg-orange-50 border-orange-200 text-orange-700 hover:border-orange-300";
      case "medium":
        return "bg-amber-50 border-amber-200 text-amber-700 hover:border-amber-300";
      case "low":
        return "bg-emerald-50 border-emerald-200 text-emerald-700 hover:border-emerald-300";
      default:
        return "bg-slate-50 border-slate-200";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          แผนที่สุขภาพ (Health Heatmap)
          <Badge variant="outline" className="font-normal text-xs">
            {districts.length} อำเภอ
          </Badge>
        </h3>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></div>{" "}
            เสี่ยงสูง
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-amber-100 border border-amber-300 rounded"></div>{" "}
            เฝ้าระวัง
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-emerald-100 border border-emerald-300 rounded"></div>{" "}
            พื้นที่ต้นแบบ
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {districts.map((district) => {
          const total = district.normal + district.risk + district.sick;
          const riskPct = total > 0 ? (district.risk / total) * 100 : 0;
          const level = getRiskLevel(riskPct);

          return (
            <Card
              key={district.name}
              className={cn(
                "cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md border-2",
                getRiskColor(level)
              )}
              onClick={() => navigate(`/detail?district=${district.name}`)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-lg truncate w-full pr-2">
                    {district.name}
                  </span>
                  {level === "high" && (
                    <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
                  )}
                  {level === "low" && (
                    <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="opacity-80">กลุ่มเสี่ยง</span>
                    <span className="font-bold">{riskPct.toFixed(1)}%</span>
                  </div>
                  {/* Tiny Progress Bar */}
                  <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        level === "high"
                          ? "bg-orange-500"
                          : level === "medium"
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      )}
                      style={{ width: `${riskPct}%` }}
                    />
                  </div>

                  <div className="pt-2 flex justify-between items-center">
                    <span className="text-xs opacity-60">
                      {total.toLocaleString()} ราย (ในระบบ)
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 -mr-2 opacity-50 hover:opacity-100"
                    >
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
