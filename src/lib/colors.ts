const HSL_VAR_REGEX = /^hsla?\(var\((--[^)]+)\)(?:\s*,\s*([0-9.]+)\s*)?\)$/i;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const hslToRgba = (h: number, s: number, l: number, alpha = 1): string => {
  const saturation = clamp01(s / 100);
  const lightness = clamp01(l / 100);

  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = ((h % 360) + 360) % 360 / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (huePrime >= 0 && huePrime < 1) {
    r1 = chroma;
    g1 = x;
  } else if (huePrime >= 1 && huePrime < 2) {
    r1 = x;
    g1 = chroma;
  } else if (huePrime >= 2 && huePrime < 3) {
    g1 = chroma;
    b1 = x;
  } else if (huePrime >= 3 && huePrime < 4) {
    g1 = x;
    b1 = chroma;
  } else if (huePrime >= 4 && huePrime < 5) {
    r1 = x;
    b1 = chroma;
  } else if (huePrime >= 5 && huePrime < 6) {
    r1 = chroma;
    b1 = x;
  }

  const m = lightness - chroma / 2;
  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);

  if (alpha >= 1) {
    return `rgb(${r}, ${g}, ${b})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${clamp01(alpha)})`;
};

const getCssVariableValue = (variable: string): string | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable);
  return value.trim() || undefined;
};

const parseHslComponents = (raw: string): [number, number, number] | undefined => {
  const cleaned = raw.split("/")[0]?.trim();
  if (!cleaned) {
    return undefined;
  }
  const parts = cleaned.split(/\s+/);
  if (parts.length < 3) {
    return undefined;
  }
  const [hStr, sStr, lStr] = parts;
  const h = Number.parseFloat(hStr);
  const s = Number.parseFloat(sStr.replace("%", ""));
  const l = Number.parseFloat(lStr.replace("%", ""));

  if (Number.isFinite(h) && Number.isFinite(s) && Number.isFinite(l)) {
    return [h, s, l];
  }
  return undefined;
};

export const resolveColorString = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  const match = trimmed.match(HSL_VAR_REGEX);
  if (!match) {
    return value;
  }

  const [, variableName, alphaMatch] = match;
  const variableValue = getCssVariableValue(variableName);
  if (!variableValue) {
    return value;
  }

  const components = parseHslComponents(variableValue);
  if (!components) {
    return value;
  }

  const [h, s, l] = components;
  const rawAlpha = alphaMatch !== undefined ? Number.parseFloat(alphaMatch) : undefined;
  const alpha = rawAlpha !== undefined && !Number.isNaN(rawAlpha) ? rawAlpha : 0.85;

  const LIGHTNESS_BOOST = 8;
  const SATURATION_FACTOR = 0.88;

  const adjustedS = Math.max(0, Math.min(100, s * SATURATION_FACTOR));
  const adjustedL = Math.max(0, Math.min(100, l + LIGHTNESS_BOOST));

  if (Number.isNaN(alpha)) {
    return value;
  }

  return hslToRgba(h, adjustedS, adjustedL, alpha);
};

type UnknownRecord = Record<string | number | symbol, unknown>;

export const resolveChartColors = <T>(input: T): T => {
  if (typeof window === "undefined" || input === null) {
    return input;
  }

  const mapValue = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(mapValue);
    }
    if (value && typeof value === "object") {
      const result: UnknownRecord = {};
      Object.entries(value as UnknownRecord).forEach(([key, item]) => {
        result[key] = mapValue(item);
      });
      return result;
    }
    return resolveColorString(value);
  };

  return mapValue(input) as T;
};
