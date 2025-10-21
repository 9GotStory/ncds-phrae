import { useMemo } from "react";
import type { ChartData, ChartOptions } from "chart.js";
import { Doughnut } from "react-chartjs-2";

import "@/lib/chartSetup";
import { cn } from "@/lib/utils";
import { resolveChartColors } from "@/lib/colors";

interface DonutChartProps {
  data: ChartData<"doughnut", number[], string>;
  options?: ChartOptions<"doughnut">;
  className?: string;
}

const defaultOptions: ChartOptions<"doughnut"> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "65%",
  plugins: {
    legend: {
      position: "right",
      labels: {
        usePointStyle: true,
        color: "hsl(var(--muted-foreground))",
      },
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const value = context.raw as number;
          const total = (context.chart.data.datasets?.[0]?.data as number[] | undefined)?.reduce(
            (sum, current) => sum + current,
            0,
          );
          const percentage = total ? ((value / total) * 100).toFixed(1) : "0.0";
          return `${context.label ?? ""}: ${value.toLocaleString()} (${percentage}%)`;
        },
      },
    },
  },
};

const DonutChart = ({ data, options, className }: DonutChartProps) => {
  const mergedOptions: ChartOptions<"doughnut"> = {
    ...defaultOptions,
    ...options,
    plugins: {
      ...(defaultOptions.plugins ?? {}),
      ...(options?.plugins ?? {}),
      legend: {
        ...(defaultOptions.plugins?.legend ?? {}),
        ...(options?.plugins?.legend ?? {}),
      },
      tooltip: {
        ...(defaultOptions.plugins?.tooltip ?? {}),
        ...(options?.plugins?.tooltip ?? {}),
      },
    },
  };

  const resolvedData = useMemo(() => resolveChartColors(data), [data]);
  const resolvedOptions = useMemo(() => resolveChartColors(mergedOptions), [mergedOptions]);

  return (
    <div className={cn("relative h-64 w-full", className)}>
      <Doughnut data={resolvedData} options={resolvedOptions} />
    </div>
  );
};

export { DonutChart };
