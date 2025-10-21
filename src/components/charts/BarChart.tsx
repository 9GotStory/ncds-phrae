import { useMemo } from "react";
import type { ChartData, ChartOptions } from "chart.js";
import { Bar } from "react-chartjs-2";

import "@/lib/chartSetup";
import { cn } from "@/lib/utils";
import { resolveChartColors } from "@/lib/colors";

interface BarChartProps {
  data: ChartData<"bar", number[], string>;
  options?: ChartOptions<"bar">;
  className?: string;
}

const defaultOptions: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom",
      labels: {
        color: "hsl(var(--foreground))",
        boxWidth: 12,
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

const BarChart = ({ data, options, className }: BarChartProps) => {
  const mergedOptions: ChartOptions<"bar"> = {
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
      <Bar data={resolvedData} options={resolvedOptions} />
    </div>
  );
};

export { BarChart };
