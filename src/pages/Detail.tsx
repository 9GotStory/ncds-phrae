import { useState } from "react";

import { Navigation } from "@/components/Navigation";

// Components
import { useDetailFilters } from "./detail-components/useDetailFilters";
import { DetailActionToolbar } from "./detail-components/DetailActionToolbar";
import { StatCards } from "./detail-components/StatCards";
import { InsightsGrid } from "./detail-components/InsightsGrid";
import { DetailDataTable } from "./detail-components/DetailDataTable";

// Custom Hooks
import { useDetailData } from "./detail-components/useDetailData";
import { useDetailStats } from "./detail-components/useDetailStats";
import { useTopRiskAreas } from "./detail-components/useTopRiskAreas";
import { useReferralData } from "./detail-components/useReferralData";

// UI Components
import { DetailError } from "./detail-components/DetailError";
import { DetailLoading } from "./detail-components/DetailLoading";

const Detail = () => {
  // 1. Setup Filters Hook
  const {
    currentFilters,
    appliedFilters,
    handleFilterChange,
    applyFilters,
    districtsQuery,
  } = useDetailFilters();

  const [recordsPage, setRecordsPage] = useState(1);
  const recordsLimit = 50;

  // 2. Data Queries & Transforms
  const {
    detailQuery,
    data,
    availability,
    summary,
    adjustmentsSummary,
    records,
    recordsTotal,
    recordsHasMore,
    showInitialLoading,
    isLoading,
    isError,
    effectiveYear,
  } = useDetailData({ appliedFilters, recordsPage, recordsLimit });

  // 3. Stats Calculations
  const { detailStats } = useDetailStats({ summary, adjustmentsSummary });

  // 4. Top Risk Areas
  const topRiskAreas = useTopRiskAreas({ data, appliedFilters });

  // 5. Referral Data
  const { totalRefer, referLocationsCount, referralAreas } = useReferralData({ data });

  // 6. Build area level label
  const areaLevelLabel =
    appliedFilters.subdistrict && appliedFilters.subdistrict !== "all"
      ? `หมู่บ้าน (ในตำบล${appliedFilters.subdistrict})`
      : appliedFilters.district && appliedFilters.district !== "all"
        ? `ตำบล (ในอำเภอ${appliedFilters.district})`
        : "อำเภอ (ภาพรวมจังหวัด)";

  // 7. Error message
  const errorMessage = (detailQuery.error as Error)?.message || (detailQuery.error as any)?.message;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <Navigation />

      {/* 1. Action Toolbar */}
      <DetailActionToolbar
        currentFilters={currentFilters}
        onFilterChange={handleFilterChange}
        onSearch={applyFilters}
        districtsMapping={districtsQuery.data}
        isLoading={isLoading}
        availability={availability}
      />

      <main className="container mx-auto px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
        {/* Loading Overlay when refetching */}
        {detailQuery.isRefetching && <DetailLoading isOverlay />}

        {/* Error State */}
        {isError && <DetailError message={errorMessage} />}

        {/* Initial Loading State */}
        {showInitialLoading ? (
          <DetailLoading message="กำลังประมวลผลข้อมูล..." />
        ) : (
          <>
            {/* 2. Stats */}
            <StatCards stats={detailStats} />

            {/* 3. Priority & Insights */}
            <InsightsGrid
              topRiskVillages={topRiskAreas}
              totalRefer={totalRefer}
              referLocationsCount={referLocationsCount}
              referralAreas={referralAreas}
              areaLevelLabel={areaLevelLabel}
            />

            {/* 4. Detailed Data Table */}
            <DetailDataTable
              data={records}
              isLoading={isLoading}
              page={recordsPage}
              setPage={setRecordsPage}
              total={recordsTotal}
              limit={recordsLimit}
              hasMore={recordsHasMore}
            />

            {/* Debug info */}
            <div className="text-center text-[10px] text-slate-300 font-mono mt-4">
              Debug: Year={effectiveYear} | District=
              {appliedFilters.district || "All"} | DetailTable=
              {data?.detailTable?.length ?? 0} | Records={records.length}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Detail;
