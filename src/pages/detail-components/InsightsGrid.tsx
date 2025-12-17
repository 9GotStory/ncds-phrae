import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, TrendingUp, ChevronRight, Ambulance } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface InsightsGridProps {
  topRiskVillages: {
    district?: string;
    subdistrict?: string;
    village?: string;
    name?: string;
    risk: number;
    normal?: number;
    sick?: number;
    total: number;
    sub?: string;
    fullLabel?: string;
  }[];
  totalRefer: number;
  referLocationsCount: number;
  referralAreas?: {
    name: string;
    sub: string;
    referCount: number;
  }[];
  areaLevelLabel: string;
}

export function InsightsGrid({
  topRiskVillages,
  totalRefer,
  referLocationsCount,
  referralAreas = [],
  areaLevelLabel,
}: InsightsGridProps) {
  return (
    <div className="flex flex-col gap-8">
      {/* Surveillance Priority List (Main Focus) - Full Width */}
      <Card className="w-full border-l-4 border-l-red-500 shadow-md flex flex-col max-h-[800px]">
        <CardHeader className="flex-none bg-white border-b sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                พื้นที่ต้องเร่งเฝ้าระวัง
              </CardTitle>
              <CardDescription>
                เรียงลำดับความเสี่ยง ในพื้นที่ <strong>{areaLevelLabel}</strong>
              </CardDescription>
            </div>
            <div className="text-xs text-muted-foreground bg-slate-100 px-2 py-1 rounded">
              พบ {topRiskVillages.length} แห่ง
            </div>
          </div>
        </CardHeader>

        {/* Scrollable List Container */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {topRiskVillages.map((village, index) => {
            const total = village.total || 1;
            const riskPct = (village.risk / total) * 100;
            const normalPct = ((village.normal || 0) / total) * 100;
            const sickPct = ((village.sick || 0) / total) * 100;

            return (
              <div
                key={`${village.district || index}-${
                  village.subdistrict || index
                }-${village.village || village.name || index}`}
                className="group flex items-start gap-4 p-3 rounded-lg border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-colors"
                id={`village-item-${index}`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm bg-slate-100 text-slate-600 mt-1 shrink-0`}
                >
                  {index + 1}
                </div>
                <div className="flex-1 space-y-3 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-bold text-slate-800 leading-tight truncate pr-2">
                        {village.fullLabel || village.name || village.village}
                      </p>
                      {!village.fullLabel && village.sub && (
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 font-normal text-slate-500 border-slate-200 shrink-0"
                        >
                          {village.sub}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Single Stacked Bar */}
                  <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                    {/* Normal (Green) */}
                    <div
                      className="bg-emerald-500 h-full border-r border-white/20"
                      style={{ width: `${normalPct}%` }}
                    />
                    {/* Risk (Orange) */}
                    <div
                      className="bg-amber-500 h-full border-r border-white/20"
                      style={{ width: `${riskPct}%` }}
                    />
                    {/* Sick (Red) */}
                    <div
                      className="bg-red-500 h-full"
                      style={{ width: `${sickPct}%` }}
                    />
                  </div>

                  {/* Complete Data Breakdown */}
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div className="bg-emerald-50 rounded px-2 py-1 text-emerald-700">
                      <span className="block font-semibold">ปกติ</span>
                      <div className="flex justify-between items-baseline mt-0.5">
                        <span>{village.normal?.toLocaleString() || 0}</span>
                        <span className="opacity-70">
                          {normalPct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="bg-amber-50 rounded px-2 py-1 text-amber-700 font-medium border border-amber-100">
                      <span className="block font-semibold">เสี่ยง</span>
                      <div className="flex justify-between items-baseline mt-0.5">
                        <span>{village.risk.toLocaleString()}</span>
                        <span className="opacity-70">
                          {riskPct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="bg-red-50 rounded px-2 py-1 text-red-700 border border-red-100">
                      <span className="block font-semibold">ป่วย</span>
                      <div className="flex justify-between items-baseline mt-0.5">
                        <span>{village.sick?.toLocaleString() || 0}</span>
                        <span className="opacity-70">
                          {sickPct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {topRiskVillages.length === 0 && (
            <div className="text-center text-muted-foreground py-10 flex flex-col items-center gap-2">
              <AlertCircle className="h-8 w-8 text-slate-200" />
              <p>ไม่พบข้อมูลกลุ่มเสี่ยงในพื้นที่นี้</p>
            </div>
          )}
        </div>
      </Card>

      {/* Secondary Insights - Separated Row */}
      <div className="w-full space-y-6">
        {/* Referral Stats Panel */}
        <Card className="bg-white border-slate-200 shadow-md">
          <CardHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Ambulance className="h-5 w-5 text-indigo-500" />
                  การส่งต่อ (Referral Dashboard)
                </CardTitle>
                <CardDescription>
                  ภาพรวมการส่งต่อผู้ป่วยเข้ารับการรักษาต่อในโรงพยาบาล
                </CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    ดูทั้งหมด ({referLocationsCount})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>
                      รายละเอียดการส่งต่อ (Referral Breakdown)
                    </DialogTitle>
                    <DialogDescription>
                      รายชื่อหมู่บ้านและจำนวนผู้ถูกส่งต่อเข้าโรงพยาบาล
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto border rounded-md mt-4">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-[80px]">ลำดับ</TableHead>
                          <TableHead>พื้นที่/หมู่บ้าน</TableHead>
                          <TableHead className="text-right">
                            จำนวนส่งต่อ
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {referralAreas.length > 0 ? (
                          referralAreas.map((area, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium text-slate-500">
                                {idx + 1}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{area.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {area.sub}
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-bold text-slate-700">
                                {area.referCount.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={3}
                              className="h-24 text-center text-muted-foreground"
                            >
                              ไม่มีข้อมูลการส่งต่อ
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Left: Key Metrics */}
              <div className="md:col-span-1 space-y-6">
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <div className="text-sm text-indigo-600 font-medium mb-1">
                    ส่งต่อโรงพยาบาล (รวม)
                  </div>
                  <div className="text-3xl font-bold text-indigo-900">
                    {totalRefer.toLocaleString()}
                    <span className="text-base font-normal text-indigo-600 ml-2">
                      ราย
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-sm text-slate-500 font-medium mb-1">
                    พื้นที่ที่มีการส่งต่อ
                  </div>
                  <div className="text-3xl font-bold text-slate-700">
                    {referLocationsCount}
                    <span className="text-base font-normal text-slate-500 ml-2">
                      แห่ง
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Top 5 Sources */}
              <div className="md:col-span-2">
                <h4 className="text-sm font-semibold text-slate-700 mb-4">
                  5 อันดับ พื้นที่ส่งต่อสูงสุด
                </h4>
                <div className="space-y-4">
                  {referralAreas.slice(0, 5).map((area, index) => {
                    const maxVal = referralAreas[0]?.referCount || 1;
                    const pct = (area.referCount / maxVal) * 100;

                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 flex items-center justify-center bg-slate-100 text-slate-500 text-xs rounded-full font-medium">
                              {index + 1}
                            </span>
                            <span className="font-medium text-slate-700">
                              {area.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({area.sub})
                            </span>
                          </div>
                          <span className="font-bold text-indigo-600">
                            {area.referCount.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {referralAreas.length === 0 && (
                    <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                      ไม่มีข้อมูลการส่งต่อ
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Suggestion */}
        <Alert className="border-amber-200 bg-amber-50">
          <TrendingUp className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">ข้อแนะนำการทำงาน</AlertTitle>
          <AlertDescription className="text-xs text-amber-700 mt-1">
            เร่งลงพื้นที่ติดตามกลุ่มเสี่ยง (แถบสีส้ม)
            ในหมู่บ้านด้านซ้ายมือเหล่านี้
            เพื่อปรับเปลี่ยนพฤติกรรมก่อนจะกลายเป็นผู้ป่วยรายใหม่ (สีแดง)
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
