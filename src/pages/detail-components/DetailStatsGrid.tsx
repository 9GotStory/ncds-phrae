import {
  Users,
  UserCheck,
  AlertTriangle,
  ActivitySquare,
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import { StatsCard } from "@/components/StatsCard";

export interface DetailStatItem {
  key: string;
  title: string;
  value: string;
  percentage: string;
  icon: any;
  variant: "default" | "success" | "warning" | "destructive";
  baseline?: number;
  diff?: number;
}

interface DetailStatsGridProps {
  stats: DetailStatItem[];
}

export function DetailStatsGrid({ stats }: DetailStatsGridProps) {
  const formatMetricWithUnit = (value: number, unit: string = "คน") => {
    return `${value.toLocaleString()} ${unit}`;
  };

  const formatMetricDelta = (value: number, unit: string = "คน") => {
    if (!Number.isFinite(value)) return "-";
    if (value === 0) return "±0";
    const sign = value > 0 ? "+" : "";
    return `${sign}${Math.trunc(value).toLocaleString()} ${unit}`;
  };

  const metricTone = (key: string, value: number) => {
    if (!Number.isFinite(value) || value === 0) return "muted";
    if (key === "normal" || key === "total") {
      return value >= 0 ? "success" : "destructive";
    }
    return value >= 0 ? "warning" : "success"; // Less risk/sick is success
  };

  const metricTrend = (value: number) => {
    if (!Number.isFinite(value) || value === 0) return "neutral";
    return value > 0 ? "up" : "down";
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      {stats.map((stat) => {
        const details: Array<{
          label: string;
          value: string;
          tone?: "default" | "muted" | "success" | "warning" | "destructive";
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
            tone: metricTone(stat.key, stat.diff) as any,
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
                    trend: metricTrend(stat.diff) as any,
                    label: "เทียบก่อนปรับ",
                  }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}
