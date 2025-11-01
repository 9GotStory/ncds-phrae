import type { NcdMetrics } from "@/services/googleSheetsApi";

const DEFAULT_CATEGORY_ORDER = [
  "Overview",
  "Obesity",
  "Diabetes",
  "Hypertension",
  "Mental",
  "Alcohol",
  "Smoking",
] as const;

const DEFAULT_STATUS_ORDER = ["normal", "risk", "sick"] as const;

type DefaultCategory = (typeof DEFAULT_CATEGORY_ORDER)[number];
type DefaultStatus = (typeof DEFAULT_STATUS_ORDER)[number];

export type MetricCategoryKey = DefaultCategory | (string & {});
export type MetricStatusKey = DefaultStatus;
export type MetricFieldKey = MetricStatusKey;

export const METRIC_CATEGORY_VALUES = DEFAULT_CATEGORY_ORDER;
export const METRIC_STATUS_VALUES = DEFAULT_STATUS_ORDER;

const toSafeNumber = (value: unknown): number => {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const uniqueCategoryKeys = (
  categories: Array<string | undefined>
): MetricCategoryKey[] => {
  const seen = new Set<string>();
  const result: MetricCategoryKey[] = [];
  categories.forEach((category) => {
    if (!category) {
      return;
    }
    if (!seen.has(category)) {
      seen.add(category);
      result.push(category);
    }
  });
  return result;
};

const resolveCategoryOrder = (
  adjusted: NcdMetrics | undefined,
  adjustments: NcdMetrics | undefined,
  override?: readonly (string | undefined)[]
): MetricCategoryKey[] => {
  if (override && override.length > 0) {
    return uniqueCategoryKeys(override.map((value) => value && String(value)));
  }

  const adjustedKeys = adjusted ? Object.keys(adjusted) : [];
  const adjustmentKeys = adjustments ? Object.keys(adjustments) : [];
  return uniqueCategoryKeys([...DEFAULT_CATEGORY_ORDER, ...adjustedKeys, ...adjustmentKeys]);
};

const resolveStatusOrder = (
  override?: readonly MetricStatusKey[]
): readonly MetricStatusKey[] => {
  if (override && override.length > 0) {
    return override;
  }
  return DEFAULT_STATUS_ORDER;
};

const buildEmptyCategory = (
  statuses: readonly MetricStatusKey[]
): Record<MetricStatusKey, number> =>
  statuses.reduce(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {} as Record<MetricStatusKey, number>
  );

export interface BaselineInvalidEntry {
  category: MetricCategoryKey;
  status: MetricStatusKey;
  baseline: number;
  adjusted: number;
  adjustment: number;
}

export interface BaselineDerivationResult {
  baseline: NcdMetrics;
  invalidEntries: BaselineInvalidEntry[];
}

export function deriveBaselineMetrics({
  adjusted,
  adjustments,
  categories,
  statuses,
}: {
  adjusted: NcdMetrics;
  adjustments?: NcdMetrics;
  categories?: readonly (string | undefined)[];
  statuses?: readonly MetricStatusKey[];
}): BaselineDerivationResult {
  const categoryOrder = resolveCategoryOrder(adjusted, adjustments, categories);
  const statusOrder = resolveStatusOrder(statuses);

  const baseline: NcdMetrics = {};
  const invalidEntries: BaselineInvalidEntry[] = [];

  categoryOrder.forEach((category) => {
    const adjustedCategory = adjusted?.[category] ?? {};
    const adjustmentCategory = adjustments?.[category] ?? {};
    const baselineCategory = buildEmptyCategory(statusOrder);

    statusOrder.forEach((status) => {
      const adjustedValue = toSafeNumber(
        (adjustedCategory as Record<string, unknown>)[status]
      );
      const adjustmentValue = toSafeNumber(
        (adjustmentCategory as Record<string, unknown>)[status]
      );
      const baselineValue = adjustedValue - adjustmentValue;

      baselineCategory[status] = baselineValue;

      if (baselineValue < 0) {
        invalidEntries.push({
          category,
          status,
          baseline: baselineValue,
          adjusted: adjustedValue,
          adjustment: adjustmentValue,
        });
      }
    });

    baseline[category] = baselineCategory;
  });

  return { baseline, invalidEntries };
}

export function computeMetricsDiff(
  baseline: NcdMetrics | undefined,
  proposed: NcdMetrics,
  options: {
    categories?: readonly (string | undefined)[];
    statuses?: readonly MetricStatusKey[];
  } = {}
): NcdMetrics {
  const categoryOrder = resolveCategoryOrder(proposed, baseline, options.categories);
  const statusOrder = resolveStatusOrder(options.statuses);
  const diff: NcdMetrics = {};

  categoryOrder.forEach((category) => {
    const baselineCategory = baseline?.[category] ?? {};
    const proposedCategory = proposed?.[category] ?? {};
    const diffCategory = buildEmptyCategory(statusOrder);

    statusOrder.forEach((status) => {
      const baselineValue = toSafeNumber(
        (baselineCategory as Record<string, unknown>)[status]
      );
      const proposedValue = toSafeNumber(
        (proposedCategory as Record<string, unknown>)[status]
      );
      diffCategory[status] = proposedValue - baselineValue;
    });

    diff[category] = diffCategory;
  });

  return diff;
}

export function isMetricsDiffEmpty(
  diff: NcdMetrics | null | undefined,
  options: {
    categories?: readonly (string | undefined)[];
    statuses?: readonly MetricStatusKey[];
  } = {}
): boolean {
  if (!diff) {
    return true;
  }

  const categoryOrder = resolveCategoryOrder(diff, undefined, options.categories);
  const statusOrder = resolveStatusOrder(options.statuses);

  return categoryOrder.every((category) => {
    const diffCategory = diff?.[category];
    if (!diffCategory) {
      return true;
    }
    return statusOrder.every(
      (status) => toSafeNumber((diffCategory as Record<string, unknown>)[status]) === 0
    );
  });
}

export type MetricsIssueReason = "negative" | "fractional";

export interface MetricsIssue {
  category: MetricCategoryKey;
  status: MetricStatusKey;
  value: number;
  reason: MetricsIssueReason;
}

export interface MetricsValidationResult {
  isValid: boolean;
  issues: MetricsIssue[];
}

export function validateMetricsRealism({
  metrics,
  categories,
  statuses,
}: {
  metrics: NcdMetrics;
  categories?: readonly (string | undefined)[];
  statuses?: readonly MetricStatusKey[];
}): MetricsValidationResult {
  const categoryOrder = resolveCategoryOrder(metrics, undefined, categories);
  const statusOrder = resolveStatusOrder(statuses);
  const issues: MetricsIssue[] = [];

  categoryOrder.forEach((category) => {
    const metricCategory = metrics?.[category] ?? {};
    statusOrder.forEach((status) => {
      const rawValue = (metricCategory as Record<string, unknown>)[status];
      const value = toSafeNumber(rawValue);

      if (value < 0) {
        issues.push({ category, status, value, reason: "negative" });
        return;
      }

      if (!Number.isInteger(value)) {
        issues.push({ category, status, value, reason: "fractional" });
      }
    });
  });

  return {
    isValid: issues.length === 0,
    issues,
  };
}
