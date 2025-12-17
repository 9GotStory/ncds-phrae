import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DashboardDistrict,
  DashboardDetailRow,
} from "@/services/googleSheetsApi";
import { ChevronDown, ChevronUp, ArrowRight, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface DistrictListItemProps {
  district: DashboardDistrict;
  index: number;
  type: "monitor" | "model";
  detailRows?: DashboardDetailRow[];
}

export function DistrictListItem({
  district,
  index,
  type,
  detailRows = [],
}: DistrictListItemProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const total = district.normal + district.risk + district.sick;
  const riskPct = total > 0 ? (district.risk / total) * 100 : 0;
  const sickPct = total > 0 ? (district.sick / total) * 100 : 0;
  const normalPct = total > 0 ? (district.normal / total) * 100 : 0;

  const isMonitor = type === "monitor";
  const themeColor = isMonitor ? "orange" : "emerald";
  const bgColor = isMonitor ? "bg-orange-50" : "bg-emerald-50";
  const borderColor = isMonitor ? "border-orange-100" : "border-emerald-100";
  const textColor = isMonitor ? "text-orange-700" : "text-emerald-700";

  // Drill-down Logic: Get Top 5 Highest Risk Villages in this District
  const topRiskVillages = useMemo(() => {
    if (!detailRows || detailRows.length === 0) return [];

    return detailRows
      .filter((r) => r.district === district.name)
      .sort((a, b) => b.risk - a.risk) // Sort by risk count (descending)
      .slice(0, 5); // Take top 5
  }, [detailRows, district.name]);

  // Handle clickable row for Deep Linking
  const handleDeepLink = (v: DashboardDetailRow) => {
    // Construct search params
    const params = new URLSearchParams();
    if (v.district) params.set("district", v.district);
    if (v.subdistrict) params.set("subdistrict", v.subdistrict);
    if (v.village) params.set("village", v.village); // Ensure we link to exact village
    if (v.moo) params.set("moo", v.moo);

    // Date Context: Use row year/month if valid, otherwise default to current Fiscal Year
    // Defaulting to 2025 (latest fiscal) if row missing to ensure data shows up in Detail page
    const year = v.year || new Date().getFullYear() + 543; // Simple Thai year logic or hardcode 2025
    const month = v.month || new Date().getMonth() + 1;

    if (year) params.set("year", year.toString());
    if (month) params.set("month", month.toString());

    navigate(`/detail?${params.toString()}`);
  };

  return (
    <div
      className={cn(
        "rounded-lg border transition-all duration-200",
        borderColor,
        bgColor,
        isOpen ? "shadow-md" : ""
      )}
    >
      {/* Header (Always Visible) */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "w-6 h-6 flex items-center justify-center font-bold text-xs rounded-full shadow-sm bg-white",
              isMonitor ? "text-orange-600" : "text-emerald-600"
            )}
          >
            {index + 1}
          </span>
          <div>
            <div className="font-semibold text-slate-800 flex items-center gap-2">
              {district.name}
              {isOpen && (
                <Badge
                  variant="outline"
                  className="text-[10px] h-4 px-1 font-normal bg-white/50"
                >
                  Drilldown
                </Badge>
              )}
            </div>
            {/* Summary Line in Header (Hidden when open to reduce redundancy) */}
            {!isOpen && (
              <div
                className={cn(
                  "text-xs font-medium",
                  isMonitor ? "text-orange-600" : "text-emerald-600"
                )}
              >
                {isMonitor
                  ? `เสี่ยง: ${district.risk.toLocaleString()} ราย (${riskPct.toFixed(
                      1
                    )}%)`
                  : `ปกติ: ${district.normal.toLocaleString()} ราย (${normalPct.toFixed(
                      1
                    )}%)`}
              </div>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600"
        >
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Expanded Details */}
      {isOpen && (
        <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-2 duration-200">
          <div className="my-2 h-px w-full bg-black/5" />

          {/* 1. Meaningful Progress Bar (Keep visuals, drop redundant numbers) */}
          <div className="mb-3 space-y-1">
            <div className="flex justify-between text-[10px] text-slate-500 opacity-80">
              <span>สัดส่วนสุขภาพ (ปกติ/เสี่ยง/ป่วย)</span>
              <span>รวม {total.toLocaleString()}</span>
            </div>
            <div className="h-2 w-full bg-slate-200/50 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-400"
                style={{ width: `${normalPct}%` }}
                title={`ปกติ ${normalPct.toFixed(0)}%`}
              />
              <div
                className="h-full bg-orange-400"
                style={{ width: `${riskPct}%` }}
                title={`เสี่ยง ${riskPct.toFixed(0)}%`}
              />
              <div
                className="h-full bg-red-400"
                style={{ width: `${sickPct}%` }}
                title={`ป่วย ${sickPct.toFixed(0)}%`}
              />
            </div>
          </div>

          {/* 2. Micro-Drilldown Table (Top 5 Risk Villages) - CLICKABLE */}
          {topRiskVillages.length > 0 ? (
            <div className="mb-3 bg-white/60 rounded-md border border-slate-100 overflow-hidden">
              <div className="px-2 py-1.5 bg-slate-100/50 text-[10px] uppercase font-semibold text-slate-500 flex justify-between items-center">
                <span>พื้นที่เสี่ยงสูงสุด (กดเพื่อดูรายละเอียด)</span>
                <AlertCircle className="w-3 h-3 text-orange-400" />
              </div>
              <div className="divide-y divide-slate-100">
                {topRiskVillages.map((v, i) => (
                  <div
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeepLink(v);
                    }}
                    className="relative flex items-center justify-between px-3 py-2 text-xs hover:bg-orange-50/80 cursor-pointer group transition-all duration-200 border-l-2 border-transparent hover:border-orange-400 hover:shadow-sm"
                  >
                    <div className="truncate pr-2">
                      <span className="font-bold text-slate-700 group-hover:text-orange-700 group-hover:underline decoration-dotted underline-offset-2">
                        {v.subdistrict}
                      </span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span className="text-slate-600">{v.village}</span>
                      <span className="text-slate-400 ml-1 text-[10px]">
                        (ม.{v.moo})
                      </span>
                      {v.month && v.year && (
                        <Badge
                          variant="secondary"
                          className="ml-2 h-4 px-1 text-[9px] font-normal text-slate-500 bg-slate-100"
                        >
                          {v.month}/{v.year}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-orange-600 whitespace-nowrap">
                        {v.risk}
                      </div>
                      <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-orange-400 opacity-0 group-hover:opacity-100 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-2 text-[10px] text-slate-400 italic">
              ไม่มีข้อมูลรายหมู่บ้าน
            </div>
          )}

          {/* 3. Action (View District Level) */}
          <Button
            size="sm"
            variant="outline"
            className={cn(
              "w-full h-7 text-[10px] gap-1 shadow-sm border-dashed",
              isMonitor
                ? "border-orange-200 text-orange-600 hover:bg-orange-50"
                : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
            )}
            onClick={() => navigate(`/detail?district=${district.name}`)}
          >
            ดูภาพรวมทั้งอำเภอ ({district.name})
          </Button>
        </div>
      )}
    </div>
  );
}
