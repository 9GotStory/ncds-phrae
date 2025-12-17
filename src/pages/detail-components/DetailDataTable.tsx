import { Fragment, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Database,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NcdRecord } from "@/services/googleSheetsApi";
import { cn } from "@/lib/utils";

interface DetailDataTableProps {
  data?: NcdRecord[];
  isLoading: boolean;
  page: number;
  setPage: (page: number) => void;
  total: number;
  limit: number;
}

export function DetailDataTable({
  data = [],
  isLoading,
  page,
  setPage,
  total,
  limit,
}: DetailDataTableProps) {
  const totalPages = Math.ceil(total / limit);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedRows(newSet);
  };

  return (
    <Card className="shadow-md border-slate-200">
      <CardHeader className="border-b bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-slate-500" />
            <CardTitle className="text-lg">
              ข้อมูลดิบรายหมู่บ้าน (Detailed Records)
            </CardTitle>
          </div>
          <div className="text-xs text-muted-foreground">
            แสดงผล {data.length} จาก {total} รายการ
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[50px] text-center"></TableHead>
                <TableHead className="w-[50px] text-center">#</TableHead>
                <TableHead className="w-[120px]">ช่วงเวลา</TableHead>
                <TableHead className="min-w-[200px]">
                  พื้นที่ (District/Village)
                </TableHead>
                <TableHead className="text-right text-emerald-600">
                  ปกติ
                </TableHead>
                <TableHead className="text-right text-amber-600">
                  เสี่ยง
                </TableHead>
                <TableHead className="text-right text-red-600">ป่วย</TableHead>
                <TableHead className="text-right font-bold text-slate-700">
                  ส่งต่อ
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                      <Database className="h-8 w-8 animate-pulse" />
                      <p>กำลังโหลดข้อมูล...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-32 text-center text-muted-foreground"
                  >
                    ไม่มีข้อมูลในเงื่อนไขการค้นหา
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, index) => {
                  const globalIndex = (page - 1) * limit + index + 1;
                  const isExpanded = expandedRows.has(row.id);
                  const mooBadge = row.moo ? (
                    <Badge
                      variant="outline"
                      className="mr-1 h-5 px-1 bg-slate-50 text-slate-500 border-slate-200"
                    >
                      ม.{row.moo}
                    </Badge>
                  ) : null;

                  // 1. Calculate Aggregated Totals
                  // Try to find an "Overview" or "Total" key to use as the true aggregate (unduplicated)
                  // If not found, fall back to summing (which might be inflated if patients have multiple diseases)
                  const metricEntries = row.metrics
                    ? Object.entries(row.metrics)
                    : [];

                  const overviewEntry = metricEntries.find(
                    ([key]) =>
                      key.toLowerCase() === "overview" ||
                      key.toLowerCase() === "total"
                  );

                  const metricsSum = overviewEntry
                    ? overviewEntry[1]
                    : metricEntries.reduce(
                        (acc, [key, cur]) => {
                          // Skip overview key from sum if we happened to miss it in the find above (safety)
                          if (
                            key.toLowerCase() === "overview" ||
                            key.toLowerCase() === "total"
                          )
                            return acc;
                          return {
                            normal: acc.normal + (cur.normal || 0),
                            risk: acc.risk + (cur.risk || 0),
                            sick: acc.sick + (cur.sick || 0),
                          };
                        },
                        { normal: 0, risk: 0, sick: 0 }
                      );

                  return (
                    <Fragment key={row.id || index}>
                      {/* Main Row (Aggregated) */}
                      <TableRow
                        className={cn(
                          "cursor-pointer hover:bg-slate-50/80 transition-colors",
                          isExpanded && "bg-slate-50"
                        )}
                        onClick={() => toggleRow(row.id)}
                      >
                        <TableCell className="py-2 text-center">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          )}
                        </TableCell>
                        <TableCell className="text-center text-slate-500 text-xs font-medium">
                          {globalIndex}
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="font-medium text-slate-700 mr-1">
                            {row.month}
                          </span>
                          <span className="text-slate-400">/ {row.year}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center flex-wrap gap-1">
                            {mooBadge}
                            <span className="font-bold text-slate-800">
                              {row.village || row.subdistrict || row.district}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {row.district} {">"} {row.subdistrict}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-emerald-700">
                          {metricsSum.normal.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-amber-700 bg-amber-50/30">
                          {metricsSum.risk.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-red-700 bg-red-50/30">
                          {metricsSum.sick.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-700">
                          {row.referCount?.toLocaleString() || "-"}
                        </TableCell>
                      </TableRow>

                      {/* Detail Rows (Expanded) */}
                      {isExpanded &&
                        metricEntries.length > 0 &&
                        metricEntries
                          .filter(
                            ([key]) =>
                              key.toLowerCase() !== "overview" &&
                              key.toLowerCase() !== "total"
                          )
                          .map(([diseaseKey, stats]) => (
                            <TableRow
                              key={`${row.id}-${diseaseKey}`}
                              className="bg-slate-50/50 hover:bg-slate-100/50 border-t-0"
                            >
                              <TableCell colSpan={2}></TableCell> {/* Indent */}
                              <TableCell colSpan={2} className="py-2">
                                <div className="flex items-center pl-4">
                                  <div className="w-2 h-2 rounded-full bg-slate-300 mr-2"></div>
                                  <span className="text-sm font-medium text-slate-600 uppercase w-20">
                                    {diseaseKey}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm text-emerald-600 py-2">
                                {stats.normal?.toLocaleString() || 0}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm text-amber-600 py-2">
                                {stats.risk?.toLocaleString() || 0}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm text-red-600 py-2">
                                {stats.sick?.toLocaleString() || 0}
                              </TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground py-2">
                                -
                              </TableCell>
                            </TableRow>
                          ))}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-end p-4 border-t bg-slate-50/30 gap-2">
          <span className="text-sm text-muted-foreground mr-4">
            หน้า {page} จาก {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            ก่อนหน้า
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages || isLoading}
          >
            ถัดไป
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
