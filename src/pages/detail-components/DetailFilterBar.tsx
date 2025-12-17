import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Target,
  MapPin,
  Calendar,
  Clock,
} from "lucide-react";
import {
  DetailFilters,
  targetGroupOptions,
  THAI_MONTH_LABELS,
} from "./useDetailFilters";
import {
  DashboardAvailability,
  DistrictsMapping,
} from "@/services/googleSheetsApi";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface DetailFilterBarProps {
  currentFilters: DetailFilters;
  onFilterChange: (key: keyof DetailFilters, value: string) => void;
  onSearch: () => void;
  availability?: DashboardAvailability;
  districtsMapping?: DistrictsMapping;
  isLoading?: boolean;
}

export function DetailFilterBar({
  currentFilters,
  onFilterChange,
  onSearch,
  availability,
  districtsMapping,
  isLoading,
}: DetailFilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Derived Options Logic
  const subdistrictOptions = useMemo(() => {
    if (!currentFilters.district || !availability?.subdistrictsByDistrict) {
      return [];
    }
    return availability.subdistrictsByDistrict[currentFilters.district] ?? [];
  }, [availability?.subdistrictsByDistrict, currentFilters.district]);

  const villageOptions = useMemo(() => {
    if (
      !currentFilters.district ||
      !currentFilters.subdistrict ||
      !availability?.villagesBySubdistrict
    ) {
      return [];
    }
    const key = `${currentFilters.district}::${currentFilters.subdistrict}`;
    return availability.villagesBySubdistrict[key] ?? [];
  }, [
    availability?.villagesBySubdistrict,
    currentFilters.district,
    currentFilters.subdistrict,
  ]);

  const mooOptions = useMemo(() => {
    if (
      !districtsMapping ||
      !currentFilters.district ||
      !currentFilters.subdistrict
    ) {
      return [];
    }

    const districtInfo = districtsMapping[currentFilters.district];
    if (!districtInfo) {
      return [];
    }
    const subdistrictInfo = districtInfo[currentFilters.subdistrict];
    if (!subdistrictInfo) {
      return [];
    }

    const moos = subdistrictInfo.moos ?? [];
    if (!moos.length) return [];

    if (currentFilters.village) {
      const normalizedVillage = currentFilters.village.toLowerCase();
      const filtered = moos.filter((moo) =>
        normalizedVillage.includes(moo.toLowerCase())
      );
      if (filtered.length) return filtered;
    }

    return moos;
  }, [
    districtsMapping,
    currentFilters.district,
    currentFilters.subdistrict,
    currentFilters.village,
  ]);

  const monthsByYear = useMemo(() => {
    const mapping: Record<string, { value: string; label: string }[]> = {};
    const periods = availability?.periods ?? [];

    periods.forEach((period) => {
      const key = period.key ?? "";
      const [yearPart, monthPart] = key.split("-");
      if (!yearPart || !monthPart) return;

      const monthNumber = Number(monthPart);
      if (!Number.isFinite(monthNumber)) return;

      const monthValue = String(monthNumber);
      const monthLabel =
        THAI_MONTH_LABELS[monthNumber] ?? `เดือนที่ ${monthNumber}`;

      if (!mapping[yearPart]) mapping[yearPart] = [];
      if (!mapping[yearPart].some((item) => item.value === monthValue)) {
        mapping[yearPart].push({ value: monthValue, label: monthLabel });
      }
    });

    Object.keys(mapping).forEach((yearKey) => {
      mapping[yearKey].sort((a, b) => Number(b.value) - Number(a.value));
    });

    return mapping;
  }, [availability?.periods]);

  const monthOptions = useMemo(() => {
    if (!currentFilters.year) return [];
    return monthsByYear[currentFilters.year] ?? [];
  }, [currentFilters.year, monthsByYear]);

  // Counts for active filters to show in badge/summry
  const activeCount = [
    currentFilters.district,
    currentFilters.subdistrict,
    currentFilters.village,
    currentFilters.year,
  ].filter(Boolean).length;

  return (
    <Card className="shadow-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between p-4 px-6">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">ตัวกรองข้อมูล</h3>
            {activeCount > 0 && !isOpen && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {activeCount} ตัวกรอง
              </span>
            )}
          </div>

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1">
              {isOpen ? "ซ่อนตัวกรอง" : "แสดงตัวกรอง"}
              {isOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0 pb-6 px-6 border-t pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Target Group */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <Target className="w-4 h-4" />
                  กลุ่มเป้าหมาย
                </label>
                <Select
                  value={currentFilters.targetGroup}
                  onValueChange={(val) => onFilterChange("targetGroup", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกกลุ่มเป้าหมาย" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetGroupOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 2. District */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  อำเภอ
                </label>
                <Select
                  value={currentFilters.district}
                  onValueChange={(val) => onFilterChange("district", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="ทุกอำเภอ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all_district__">ทุกอำเภอ</SelectItem>
                    {(availability?.districts ?? []).map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 3. Subdistrict */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  ตำบล
                </label>
                <Select
                  value={currentFilters.subdistrict}
                  disabled={
                    !currentFilters.district ||
                    currentFilters.district === "__all_district__"
                  }
                  onValueChange={(val) => onFilterChange("subdistrict", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="ทุกตำบล" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all_subdistrict__">ทุกตำบล</SelectItem>
                    {subdistrictOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 4. Village */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  หมู่บ้าน
                </label>
                <Select
                  value={currentFilters.village}
                  disabled={!currentFilters.subdistrict}
                  onValueChange={(val) => onFilterChange("village", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="ทุกหมู่บ้าน" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all_village__">ทุกหมู่บ้าน</SelectItem>
                    {villageOptions.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rows 2 */}

              {/* 5. Year */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  ปีงบประมาณ
                </label>
                <Select
                  value={currentFilters.year}
                  onValueChange={(val) => onFilterChange("year", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="ทุกปี" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all_year__">ทุกปี</SelectItem>
                    {(availability?.years ?? []).map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 6. Month */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  เดือน
                </label>
                <Select
                  value={currentFilters.month}
                  disabled={!currentFilters.year}
                  onValueChange={(val) => onFilterChange("month", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="ทุกเดือน" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all_month__">ทุกเดือน</SelectItem>
                    {monthOptions.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* 7. Moo */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  หมู่ที่
                </label>
                <Select
                  value={currentFilters.moo}
                  disabled={!currentFilters.subdistrict}
                  onValueChange={(val) => onFilterChange("moo", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="ทุกหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all_moo__">ทุกหมู่</SelectItem>
                    {mooOptions.map((m) => (
                      <SelectItem key={m} value={m}>
                        หมู่ที่ {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={onSearch}
                disabled={isLoading}
                className="w-full md:w-auto"
              >
                <Search className="w-4 h-4 mr-2" />
                {isLoading ? "กำลังค้นหา..." : "ค้นหาข้อมูล"}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
