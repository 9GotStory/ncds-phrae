import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MapPin, Filter, X, Loader2 } from "lucide-react";
import {
  DistrictsMapping,
  DashboardAvailability,
} from "@/services/googleSheetsApi";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface DetailActionToolbarProps {
  currentFilters: any;
  onFilterChange: (key: string, value: string) => void;
  onSearch: () => void;
  districtsMapping?: DistrictsMapping;
  isLoading: boolean;
  availability?: DashboardAvailability;
}

export function DetailActionToolbar({
  currentFilters,
  onFilterChange,
  onSearch,
  districtsMapping = {},
  isLoading,
  availability,
}: DetailActionToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // --- Dynamic Years ---
  const yearOptions = useMemo(() => {
    return availability?.years || [];
  }, [availability]);

  // 1. District Options
  const districtOptions = useMemo(() => {
    if (!districtsMapping) return [];
    const keys = Object.keys(districtsMapping).sort();
    return ["", ...keys]; // Prepend empty string for "All/Clear"
  }, [districtsMapping]);

  // 2. Subdistrict Options
  const subdistrictOptions = useMemo(() => {
    if (!currentFilters.district || !districtsMapping[currentFilters.district])
      return [];
    const keys = Object.keys(districtsMapping[currentFilters.district]).sort();
    return ["", ...keys];
  }, [districtsMapping, currentFilters.district]);

  // 3. Village Options
  const villageOptions = useMemo(() => {
    if (!currentFilters.district || !currentFilters.subdistrict) return [];
    const info =
      districtsMapping[currentFilters.district]?.[currentFilters.subdistrict];
    const villages = info?.villages ? [...info.villages].sort() : [];
    return ["", ...villages];
  }, [districtsMapping, currentFilters.district, currentFilters.subdistrict]);

  // 4. Moo Options
  const mooOptions = useMemo(() => {
    if (!currentFilters.subdistrict) return [];
    const info =
      districtsMapping[currentFilters.district]?.[currentFilters.subdistrict];
    const moos = info?.moos
      ? [...info.moos].sort((a, b) => Number(a) - Number(b))
      : [];
    return ["", ...moos];
  }, [districtsMapping, currentFilters.district, currentFilters.subdistrict]);

  // Helper to count active filters
  const activeFilterCount = [
    currentFilters.year,
    currentFilters.district,
    currentFilters.subdistrict,
    currentFilters.village,
  ].filter(Boolean).length;

  const FilterControls = () => (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 w-full">
      {/* Year */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500 ml-1">
          ปีงบประมาณ
        </label>
        <Select
          value={currentFilters.year?.toString() || "all"}
          onValueChange={(val) =>
            onFilterChange("year", val === "all" ? "" : val)
          }
        >
          <SelectTrigger className="w-full bg-white border-slate-200 focus:ring-primary/20 h-10">
            <SelectValue placeholder="ทุกปีงบประมาณ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกปีงบประมาณ</SelectItem>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* District */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500 ml-1">
          อำเภอ
        </label>
        <Select
          value={currentFilters.district || "all"}
          onValueChange={(val) =>
            onFilterChange("district", val === "all" ? "" : val)
          }
        >
          <SelectTrigger className="w-full bg-white border-slate-200 focus:ring-primary/20 h-10">
            <SelectValue placeholder="ทุกอำเภอ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกอำเภอ</SelectItem>
            {districtOptions
              .filter((d) => d !== "")
              .map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subdistrict */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500 ml-1">
          ตำบล
        </label>
        <Select
          value={currentFilters.subdistrict || "all"}
          onValueChange={(val) =>
            onFilterChange("subdistrict", val === "all" ? "" : val)
          }
          disabled={!currentFilters.district}
        >
          <SelectTrigger className="w-full bg-white border-slate-200 focus:ring-primary/20 h-10">
            <SelectValue placeholder="ทุกตำบล" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกตำบล</SelectItem>
            {subdistrictOptions
              .filter((d) => d !== "")
              .map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Village */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500 ml-1">
          หมู่บ้าน
        </label>
        <Select
          value={currentFilters.village || "all"}
          onValueChange={(val) =>
            onFilterChange("village", val === "all" ? "" : val)
          }
          disabled={!currentFilters.subdistrict}
        >
          <SelectTrigger className="w-full bg-white border-slate-200 focus:ring-primary/20 h-10">
            <SelectValue placeholder="ทุกหมู่บ้าน" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกหมู่บ้าน</SelectItem>
            {villageOptions
              .filter((d) => d !== "")
              .map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Moo */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500 ml-1">
          หมู่ที่
        </label>
        <Select
          value={currentFilters.moo || "all"}
          onValueChange={(val) =>
            onFilterChange("moo", val === "all" ? "" : val)
          }
          disabled={!currentFilters.subdistrict}
        >
          <SelectTrigger className="w-full bg-white border-slate-200 focus:ring-primary/20 h-10">
            <SelectValue placeholder="ทุกหมู่" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกหมู่</SelectItem>
            {mooOptions
              .filter((d) => d !== "")
              .map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Search Button (Desktop) */}
      <div className="pt-5 hidden md:block">
        <Button
          onClick={onSearch}
          disabled={isLoading}
          className="w-full shadow-sm bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              กำลังโหลดข้อมูล...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" /> ค้นหา
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="sticky top-[64px] z-30 w-full glass-bar bg-white/50 backdrop-blur-md border-b shadow-sm py-2 px-4 mb-6 transition-all duration-200">
      <div className="container mx-auto">
        {/* Desktop View: Inline Filters */}
        <div className="hidden md:block">
          <FilterControls />
        </div>

        {/* Mobile View: Filter Bar with Sheet Trigger */}
        <div className="md:hidden flex items-center justify-between gap-3">
          {/* Active Filter Summary Pills */}
          <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide py-1">
            {activeFilterCount === 0 && (
              <span className="text-sm text-slate-400 italic pl-1">
                แสดงข้อมูลภาพรวมจังหวัด...
              </span>
            )}
            {currentFilters.district && (
              <Badge
                variant="secondary"
                className="bg-white border-slate-200 text-slate-700 whitespace-nowrap shadow-sm"
              >
                {currentFilters.district}
              </Badge>
            )}
            {currentFilters.subdistrict && (
              <Badge
                variant="secondary"
                className="bg-white border-slate-200 text-slate-700 whitespace-nowrap shadow-sm"
              >
                ต.{currentFilters.subdistrict}
              </Badge>
            )}
          </div>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 border-primary/20 text-primary hover:bg-primary/5 shadow-sm"
              >
                <Filter className="h-4 w-4" />
                ตัวกรอง
                {activeFilterCount > 0 && (
                  <Badge
                    variant="default"
                    className="h-5 px-1.5 ml-0.5 text-[10px] bg-primary text-white hover:bg-primary"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="rounded-t-xl h-[85vh] flex flex-col p-0"
            >
              <SheetHeader className="p-4 border-b bg-slate-50/80 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <SheetTitle className="flex items-center gap-2 text-slate-800">
                    <Search className="h-5 w-5 text-primary" />
                    ค้นหาละเอียด
                  </SheetTitle>
                  {/* Close button provided by SheetPrimitive automatically, but we can add a custom reset if needed */}
                </div>
                <SheetDescription asChild>
                  <div className="text-xs text-slate-500">
                    เลือกพื้นที่และช่วงเวลาที่ต้องการดูข้อมูล
                  </div>
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-4 bg-white">
                <FilterControls />
              </div>

              <SheetFooter className="p-4 border-t bg-slate-50/80 mt-auto">
                <SheetClose asChild>
                  <Button
                    onClick={() => {
                      onSearch();
                      setIsOpen(false);
                    }}
                    disabled={isLoading}
                    className="w-full bg-primary hover:bg-primary/90 h-11 text-base shadow-md"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        กำลังโหลดข้อมูล...
                      </>
                    ) : (
                      "ยืนยันการค้นหา"
                    )}
                  </Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
