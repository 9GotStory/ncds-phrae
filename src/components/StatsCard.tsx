import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardDetail {
  label: string;
  value: string;
  tone?: "default" | "muted" | "success" | "warning" | "destructive";
}

interface StatsCardDelta {
  value: string;
  trend?: "up" | "down" | "neutral";
  label?: string;
}

interface StatsCardProps {
  title: string;
  value: string;
  percentage: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  variant?: "default" | "success" | "warning" | "destructive";
  details?: StatsCardDetail[];
  delta?: StatsCardDelta;
}

export const StatsCard = ({ 
  title, 
  value, 
  percentage, 
  icon: Icon,
  variant = "default",
  details = [],
  delta,
}: StatsCardProps) => {
  const variantStyles = {
    default: "bg-card border-border",
    success: "bg-success/10 border-success/20",
    warning: "bg-warning/10 border-warning/20",
    destructive: "bg-destructive/10 border-destructive/20"
  };

  const iconVariantStyles = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive"
  };

  const detailToneClass = (tone: StatsCardDetail["tone"]) => {
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

  const deltaStyles = (() => {
    if (!delta) {
      return "";
    }
    switch (delta.trend) {
      case "up":
        return "text-success bg-success/10";
      case "down":
        return "text-destructive bg-destructive/10";
      default:
        return "text-muted-foreground bg-muted";
    }
  })();

  const deltaIcon = (() => {
    if (!delta || !delta.trend) {
      return null;
    }
    if (delta.trend === "up") {
      return "+";
    }
    if (delta.trend === "down") {
      return "-";
    }
    return "~";
  })();

  return (
    <Card className={`transition-all duration-300 hover:shadow-lg ${variantStyles[variant]}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-3 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
              <span className="text-lg text-muted-foreground">{percentage}</span>
            </div>
            {delta ? (
              <div className="flex items-center gap-2 text-sm">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${deltaStyles}`}>
                  {deltaIcon ? <span className="text-xs leading-none">{deltaIcon}</span> : null}
                  <span>{delta.value}</span>
                </span>
                {delta.label ? (
                  <span className="text-xs text-muted-foreground">{delta.label}</span>
                ) : null}
              </div>
            ) : null}
            {details.length ? (
              <div className="space-y-1">
                {details.map((detail) => (
                  <div key={`${detail.label}-${detail.value}`} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{detail.label}</span>
                    <span className={`font-medium ${detailToneClass(detail.tone)}`}>
                      {detail.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className={`p-3 rounded-xl ${iconVariantStyles[variant]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
