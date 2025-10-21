import { useMemo } from "react";
import type { ChartData, ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";

import "@/lib/chartSetup";
import { cn } from "@/lib/utils";
import { resolveChartColors } from "@/lib/colors";

interface LineChartProps {
  data: ChartData<"line", number[], string>;
  options?: ChartOptions<"line">;
  className?: string;
}

const defaultOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: "index",
  },
  plugins: {
    legend: {
      position: "bottom",
      labels: {
        color: "hsl(var(--muted-foreground))",
        usePointStyle: true,
      },
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const value = context.raw as number;
          return `${context.dataset.label ?? ""}: ${value.toLocaleString()}`;
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: "hsl(var(--muted-foreground))",
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        color: "hsl(var(--muted-foreground))",
        callback: (value) => Number(value).toLocaleString(),
      },
    },
  },
};

const LineChart = ({ data, options, className }: LineChartProps) => {
  const mergedOptions: ChartOptions<"line"> = {
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
    scales: {
      ...(defaultOptions.scales ?? {}),
      ...(options?.scales ?? {}),
      x: {
        ...(defaultOptions.scales?.x ?? {}),
        ...(options?.scales?.x ?? {}),
      },
      y: {
        ...(defaultOptions.scales?.y ?? {}),
        ...(options?.scales?.y ?? {}),
      },
    },
  };

  const resolvedData = useMemo(() => resolveChartColors(data), [data]);
  const resolvedOptions = useMemo(() => resolveChartColors(mergedOptions), [mergedOptions]);

  return (
    <div className={cn("h-80 w-full", className)}>
      <Line data={resolvedData} options={resolvedOptions} />
    </div>
  );
};

export { LineChart };
