import { Navigation } from "@/components/Navigation";
import { LoadingState } from "@/components/LoadingState";

// Components
import { OverviewHero } from "./overview-components/OverviewHero";
import { DistrictRiskHeatmap } from "./overview-components/DistrictRiskHeatmap";

// Custom Hooks
import { useOverviewData } from "./overview-components/useOverviewData";
import { useHealthScore } from "./overview-components/useHealthScore";
import { useAreaRankings } from "./overview-components/useAreaRankings.ts";
import { useComparisonStats } from "./overview-components/useComparisonStats";

// UI Components
import { OverviewHeader } from "./overview-components/OverviewHeader";
import { OverviewError } from "./overview-components/OverviewError";
import { OverviewStrategicPanel } from "./overview-components/OverviewStrategicPanel";

const Overview = () => {
  // 1. Fetch Data
  const {
    data,
    stats,
    summary,
    totalPop,
    districts,
    detailTable,
    isInitialLoading,
    isError,
  } = useOverviewData();

  // 2. Calculate Health Score
  const healthScore = useHealthScore({ summary, totalPop });

  // 3. Calculate Area Rankings
  const { areasNeedingSupport, modelCommunities } = useAreaRankings(districts);

  // 4. Calculate Comparison Stats (Trends)
  const comparisonStats = useComparisonStats(detailTable);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <Navigation />

      <main className="container mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header */}
        <OverviewHeader period={data?.metadata?.period} />

        {/* Error State */}
        {isError && <OverviewError />}

        {/* Loading State */}
        {isInitialLoading ? (
          <LoadingState message="กำลังโหลดข้อมูล..." />
        ) : (
          <>
            {/* 1. Hero Section: Executive Scorecard */}
            <OverviewHero
              stats={stats}
              healthScore={healthScore}
              totalPopulation={totalPop}
              criticalDistricts={districts.filter((d) => {
                const t = d.normal + d.risk + d.sick;
                return t > 0 && d.risk / t >= 0.2;
              })}
              comparisonStats={comparisonStats}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 2. Strategic Map (Heatmap) */}
              <div className="lg:col-span-2 space-y-6">
                <DistrictRiskHeatmap districts={districts} />
              </div>

              {/* 3. Strategic Prioritization Panel */}
              <div>
                <OverviewStrategicPanel
                  areasNeedingSupport={areasNeedingSupport}
                  modelCommunities={modelCommunities}
                  detailTable={detailTable}
                />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Overview;
