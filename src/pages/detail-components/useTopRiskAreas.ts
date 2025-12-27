import { useMemo } from "react";

export interface RiskArea {
  name: string;
  sub: string;
  fullLabel: string;
  risk: number;
  total: number;
  normal: number;
  sick: number;
}

interface UseTopRiskAreasParams {
  data?: {
    detailTable?: Array<{
      district: string;
      subdistrict: string;
      village: string;
      moo?: string;
      normal: number;
      risk: number;
      sick: number;
    }>;
    comparison?: {
      areas: Array<{
        name: string;
        stats?: { normal?: number; risk?: number; sick?: number };
      }>;
    };
    districts?: Array<{
      name: string;
      normal: number;
      risk: number;
      sick: number;
    }>;
  };
  appliedFilters: {
    district?: string;
    subdistrict?: string;
  };
}

export function useTopRiskAreas({
  data,
  appliedFilters,
}: UseTopRiskAreasParams): RiskArea[] {
  return useMemo(() => {
    // Priority 1: Use detailTable (most detailed - village level)
    if (data?.detailTable && data.detailTable.length > 0) {
      const map = new Map<string, RiskArea>();

      data.detailTable.forEach((row) => {
        const key = `${row.district}-${row.subdistrict}-${row.village}-${
          row.moo || "0"
        }`;

        const mooPart = row.moo ? `หมู่ที่ ${row.moo} ` : "";
        const villagePart = row.village ? `${row.village}` : "ไม่ระบุชื่อ";
        const contextPart = `(ต.${row.subdistrict || "?"}, อ.${
          row.district || "?"
        })`;
        const fullLabel = `${mooPart}${villagePart} ${contextPart}`;

        const exist = map.get(key) || {
          name: row.village,
          sub: "หมู่บ้าน",
          fullLabel: fullLabel,
          normal: 0,
          risk: 0,
          sick: 0,
          total: 0,
        };

        exist.risk += row.risk || 0;
        exist.normal += row.normal || 0;
        exist.sick += row.sick || 0;
        exist.total += (row.normal || 0) + (row.risk || 0) + (row.sick || 0);

        map.set(key, exist);
      });

      return Array.from(map.values()).sort((a, b) => b.risk - a.risk);
    }

    // Priority 2: Use comparison areas
    if (data?.comparison?.areas && data.comparison.areas.length > 0) {
      return data.comparison.areas
        .map((area) => {
          let contextLabel = area.name;
          let subLabel = "";

          if (appliedFilters.subdistrict) {
            subLabel = "หมู่บ้าน";
            contextLabel = `บ้าน${area.name} (ต.${appliedFilters.subdistrict})`;
          } else if (appliedFilters.district) {
            subLabel = "ตำบล";
            contextLabel = `ต.${area.name} (อ.${appliedFilters.district})`;
          } else {
            subLabel = "อำเภอ";
            contextLabel = `อ.${area.name}`;
          }

          return {
            name: area.name,
            sub: subLabel,
            fullLabel: contextLabel,
            risk: area.stats?.risk || 0,
            total:
              (area.stats?.normal || 0) +
              (area.stats?.risk || 0) +
              (area.stats?.sick || 0),
            normal: area.stats?.normal || 0,
            sick: area.stats?.sick || 0,
          };
        })
        .sort((a, b) => b.risk - a.risk);
    }

    // Priority 3: Use districts
    if (data?.districts && data.districts.length > 0 && !appliedFilters.district) {
      return data.districts
        .map((d) => ({
          name: d.name,
          sub: "อำเภอ",
          fullLabel: `อ.${d.name}`,
          risk: d.risk,
          total: d.normal + d.risk + d.sick,
          normal: d.normal,
          sick: d.sick,
        }))
        .sort((a, b) => b.risk - a.risk);
    }

    return [];
  }, [data, appliedFilters]);
}
