import { describe, expect, it } from "vitest";

import type { NcdMetrics } from "@/services/googleSheetsApi";

import {
  METRIC_CATEGORY_VALUES,
  METRIC_STATUS_VALUES,
  computeMetricsDiff,
  deriveBaselineMetrics,
  isMetricsDiffEmpty,
  validateMetricsRealism,
} from "./ncdMetrics";

const createMetrics = (overrides: Partial<NcdMetrics>): NcdMetrics => ({
  Overview: { normal: 0, risk: 0, sick: 0 },
  Obesity: { normal: 0, risk: 0, sick: 0 },
  Diabetes: { normal: 0, risk: 0, sick: 0 },
  Hypertension: { normal: 0, risk: 0, sick: 0 },
  Mental: { normal: 0, risk: 0, sick: 0 },
  Alcohol: { normal: 0, risk: 0, sick: 0 },
  Smoking: { normal: 0, risk: 0, sick: 0 },
  ...overrides,
});

describe("deriveBaselineMetrics", () => {
  it("returns the adjusted values when there are no adjustments", () => {
    const adjusted = createMetrics({
      Overview: { normal: 120, risk: 30, sick: 12 },
      Diabetes: { normal: 40, risk: 8, sick: 4 },
    });

    const result = deriveBaselineMetrics({
      adjusted,
      categories: METRIC_CATEGORY_VALUES,
      statuses: METRIC_STATUS_VALUES,
    });

    expect(result.invalidEntries).toHaveLength(0);
    expect(result.baseline).toEqual(adjusted);
  });

  it("subtracts adjustments from adjusted totals to recover the baseline", () => {
    const adjusted = createMetrics({
      Overview: { normal: 100, risk: 20, sick: 5 },
      Hypertension: { normal: 60, risk: 15, sick: 3 },
    });
    const adjustments = createMetrics({
      Overview: { normal: 10, risk: 5, sick: 0 },
      Hypertension: { normal: 5, risk: 0, sick: 1 },
    });

    const { baseline, invalidEntries } = deriveBaselineMetrics({
      adjusted,
      adjustments,
      categories: METRIC_CATEGORY_VALUES,
      statuses: METRIC_STATUS_VALUES,
    });

    expect(invalidEntries).toHaveLength(0);
    expect(baseline.Overview).toEqual({ normal: 90, risk: 15, sick: 5 });
    expect(baseline.Hypertension).toEqual({ normal: 55, risk: 15, sick: 2 });
  });

  it("flags categories where adjustments would make baseline negative", () => {
    const adjusted = createMetrics({
      Overview: { normal: 20, risk: 10, sick: 5 },
    });
    const adjustments = createMetrics({
      Overview: { normal: 25, risk: 5, sick: 0 },
    });

    const { baseline, invalidEntries } = deriveBaselineMetrics({
      adjusted,
      adjustments,
      categories: METRIC_CATEGORY_VALUES,
      statuses: METRIC_STATUS_VALUES,
    });

    expect(baseline.Overview.normal).toBe(-5);
    expect(invalidEntries).toEqual([
      {
        category: "Overview",
        status: "normal",
        baseline: -5,
        adjusted: 20,
        adjustment: 25,
      },
    ]);
  });
});

describe("computeMetricsDiff", () => {
  it("computes diff between baseline and proposed values", () => {
    const baseline = createMetrics({
      Overview: { normal: 90, risk: 15, sick: 5 },
      Diabetes: { normal: 40, risk: 10, sick: 2 },
    });
    const proposed = createMetrics({
      Overview: { normal: 95, risk: 12, sick: 6 },
      Diabetes: { normal: 38, risk: 12, sick: 2 },
    });

    const diff = computeMetricsDiff(baseline, proposed, {
      categories: METRIC_CATEGORY_VALUES,
      statuses: METRIC_STATUS_VALUES,
    });

    expect(diff.Overview).toEqual({ normal: 5, risk: -3, sick: 1 });
    expect(diff.Diabetes).toEqual({ normal: -2, risk: 2, sick: 0 });
  });
});

describe("isMetricsDiffEmpty", () => {
  it("returns true when diff is empty or all values are zero", () => {
    expect(
      isMetricsDiffEmpty(null, {
        categories: METRIC_CATEGORY_VALUES,
        statuses: METRIC_STATUS_VALUES,
      })
    ).toBe(true);
    expect(
      isMetricsDiffEmpty(
        createMetrics({
          Overview: { normal: 0, risk: 0, sick: 0 },
        }),
        {
          categories: METRIC_CATEGORY_VALUES,
          statuses: METRIC_STATUS_VALUES,
        }
      )
    ).toBe(true);
  });

  it("returns false when at least one value is non-zero", () => {
    expect(
      isMetricsDiffEmpty(
        createMetrics({
          Overview: { normal: 0, risk: 1, sick: 0 },
        }),
        {
          categories: METRIC_CATEGORY_VALUES,
          statuses: METRIC_STATUS_VALUES,
        }
      )
    ).toBe(false);
  });
});

describe("validateMetricsRealism", () => {
  it("accepts metrics that are non-negative integers", () => {
    const metrics = createMetrics({
      Overview: { normal: 120, risk: 30, sick: 12 },
      Smoking: { normal: 15, risk: 3, sick: 1 },
    });

    const result = validateMetricsRealism({
      metrics,
      categories: METRIC_CATEGORY_VALUES,
      statuses: METRIC_STATUS_VALUES,
    });

    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("flags negative or fractional values as unrealistic", () => {
    const metrics = createMetrics({
      Overview: { normal: -1, risk: 10, sick: 2 },
      Alcohol: { normal: 5.5, risk: 1, sick: 0 },
    });

    const result = validateMetricsRealism({
      metrics,
      categories: METRIC_CATEGORY_VALUES,
      statuses: METRIC_STATUS_VALUES,
    });

    expect(result.isValid).toBe(false);
    expect(result.issues).toEqual([
      {
        category: "Overview",
        status: "normal",
        value: -1,
        reason: "negative",
      },
      expect.objectContaining({
        category: "Alcohol",
        status: "normal",
        value: 5.5,
        reason: "fractional",
      }),
    ]);
  });
});
