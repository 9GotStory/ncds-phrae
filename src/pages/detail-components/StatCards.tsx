import {
  ArrowDown,
  ArrowUp,
  Minus,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardsProps {
  stats: {
    key: string;
    title: string;
    value: number;
    percentage?: number;
    variant: "default" | "success" | "warning" | "destructive";
    trend?: {
      value: number;
      label: string;
    };
  }[];
}

export function StatCards({ stats }: StatCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const trendValue = stat.trend?.value || 0;
        const isPositive = trendValue > 0;
        const isNegative = trendValue < 0;

        let TrendIcon = Minus;
        let trendColor = "text-slate-400";

        if (stat.variant === "success" || stat.variant === "default") {
          // Normal/Total: Up is Good/Neutral
          if (isPositive) {
            TrendIcon = ArrowUp;
            trendColor = "text-emerald-600";
          }
          if (isNegative) {
            TrendIcon = ArrowDown;
            trendColor = "text-red-500";
          }
        } else {
          // Risk/Sick: Up is Bad
          if (isPositive) {
            TrendIcon = ArrowUp;
            trendColor = "text-red-500";
          }
          if (isNegative) {
            TrendIcon = ArrowDown;
            trendColor = "text-emerald-600";
          }
        }

        // Determine Main Icon
        let MainIcon = Users;
        let iconColor = "text-slate-500";

        if (stat.variant === "success") {
          MainIcon = CheckCircle;
          iconColor = "text-emerald-500";
        } else if (stat.variant === "warning") {
          MainIcon = AlertTriangle;
          iconColor = "text-amber-500";
        } else if (stat.variant === "destructive") {
          MainIcon = Activity;
          iconColor = "text-red-500";
        } else {
          MainIcon = Users;
          iconColor = "text-blue-500";
        }

        return (
          <Card
            key={stat.key}
            className={cn(
              "overflow-hidden backdrop-blur-sm bg-white/50 border-t-4 shadow-sm hover:shadow-md transition-all",
              stat.variant === "success" && "border-t-emerald-500",
              stat.variant === "warning" && "border-t-amber-500",
              stat.variant === "destructive" && "border-t-red-500",
              stat.variant === "default" && "border-t-blue-500"
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <MainIcon className={cn("h-4 w-4", iconColor)} />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold text-gray-900">
                  {stat.value.toLocaleString()}
                </div>
                {stat.percentage !== undefined && (
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      stat.variant === "success" &&
                        "bg-emerald-100 text-emerald-700",
                      stat.variant === "warning" &&
                        "bg-amber-100 text-amber-700",
                      stat.variant === "destructive" &&
                        "bg-red-100 text-red-700",
                      stat.variant === "default" &&
                        "bg-slate-100 text-slate-700"
                    )}
                  >
                    {stat.percentage.toFixed(1)}%
                  </span>
                )}
              </div>

              {stat.trend && (
                <div className="flex items-center mt-2 text-xs text-muted-foreground">
                  <TrendIcon className={cn("h-3 w-3 mr-1", trendColor)} />
                  <span className={cn("font-medium mr-1", trendColor)}>
                    {Math.abs(trendValue).toLocaleString()}
                  </span>
                  <span>{stat.trend.label}</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
