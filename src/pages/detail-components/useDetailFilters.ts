import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/useAuth";
import type { DashboardAvailability } from "@/services/googleSheetsApi";
import { googleSheetsApi } from "@/services/googleSheetsApi";
import { useQuery } from "@tanstack/react-query";

export interface DetailFilters {
  targetGroup: string;
  district: string;
  subdistrict: string;
  village: string;
  moo: string;
  year: string;
  month: string;
}

export const initialFilters: DetailFilters = {
  targetGroup: "general",
  district: "",
  subdistrict: "",
  village: "",
  moo: "",
  year: "",
  month: "",
};

export const targetGroupOptions = [
  { value: "general", label: "บุคคลทั่วไป" },
  { value: "monk", label: "พระสงฆ์" },
];

export const THAI_MONTH_LABELS = [
  "",
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export function useDetailFilters() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const lastAppliedQueryRef = useRef<string | null>(null);

  const [currentFilters, setCurrentFilters] = useState<DetailFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<DetailFilters>(initialFilters);

  // Sync with User Role
  useEffect(() => {
    if (user?.role === "officer" && user.district) {
      setCurrentFilters((prev) => (prev.district ? prev : { ...prev, district: user.district }));
    }
  }, [user?.district, user?.role]);

  // Sync with URL Params
  useEffect(() => {
    const queryString = searchParams.toString();
    if (lastAppliedQueryRef.current === queryString) {
      return;
    }

    const getParam = (key: string) => searchParams.get(key) ?? "";
    const targetGroupParam = searchParams.get("targetGroup");

    const hasAnyParam = [
      "targetGroup",
      "district",
      "subdistrict",
      "village",
      "moo",
      "year",
      "month",
    ].some((key) => searchParams.has(key));

    if (!hasAnyParam) {
      lastAppliedQueryRef.current = queryString;
      return;
    }

    const normalizedTargetGroup = targetGroupOptions.some(
      (option) => option.value === targetGroupParam
    )
      ? (targetGroupParam as DetailFilters["targetGroup"])
      : initialFilters.targetGroup;

    const nextFilters: DetailFilters = {
      ...initialFilters,
      targetGroup: normalizedTargetGroup,
      district: getParam("district"),
      subdistrict: getParam("subdistrict"),
      village: getParam("village"),
      moo: getParam("moo"),
      year: getParam("year"),
      month: getParam("month"),
    };

    setCurrentFilters(nextFilters);
    setAppliedFilters(nextFilters);
    lastAppliedQueryRef.current = queryString;
  }, [searchParams]);

  const handleFilterChange = <T extends keyof DetailFilters>(
    key: T,
    value: DetailFilters[T]
  ) => {
    setCurrentFilters((prev) => ({
      ...prev,
      [key]: value,
      // Cascading resets
      ...(key === "targetGroup"
        ? { district: "", subdistrict: "", village: "", moo: "", year: "", month: "" }
        : {}),
      ...(key === "district" ? { subdistrict: "", village: "", moo: "" } : {}),
      ...(key === "subdistrict" ? { village: "", moo: "" } : {}),
      ...(key === "village" ? { moo: "" } : {}),
      ...(key === "year" ? { month: "" } : {}),
    }));
  };

  const applyFilters = () => {
    setAppliedFilters({ ...currentFilters });
  };

  const districtsQuery = useQuery({
    queryKey: ["districts"],
    queryFn: () => googleSheetsApi.getDistricts(),
  });

  return {
    currentFilters,
    setCurrentFilters,
    appliedFilters,
    setAppliedFilters,
    handleFilterChange,
    applyFilters,
    districtsQuery
  };
}
