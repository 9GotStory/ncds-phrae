import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DonutChart } from "@/components/charts/DonutChart";
import { LineChart } from "@/components/charts/LineChart";

interface DetailChartsProps {
  donutData: any; // Using any for chart.js data types for simplicity, or import exact types
  groupedData: any; // Complex type
  summary: any;
}

export function DetailCharts({
  donutData,
  groupedData,
  summary,
}: DetailChartsProps) {
  // Line Chart Data Prep (migrated from parent)
  const lineChartData =
    Object.keys(groupedData).length > 1
      ? {
          labels: Object.keys(groupedData),
          datasets: [
            {
              label: "ปกติ",
              data: Object.values(groupedData).map((districts: any) => {
                return Object.values(districts).reduce(
                  (total: number, subdistricts: any) => {
                    return (
                      total +
                      Object.values(subdistricts).reduce(
                        (subTotal: number, villages: any) => {
                          return (
                            subTotal +
                            Object.values(villages).reduce(
                              (vTotal: number, records: any) => {
                                return (
                                  vTotal +
                                  records.reduce(
                                    (rTotal: number, r: any) =>
                                      rTotal + r.normal,
                                    0
                                  )
                                );
                              },
                              0
                            )
                          );
                        },
                        0
                      )
                    );
                  },
                  0
                );
              }),
              borderColor: "hsl(var(--success))",
              backgroundColor: "hsla(var(--success), 0.1)",
              tension: 0.4,
            },
            {
              label: "เสี่ยง",
              data: Object.values(groupedData).map((districts: any) => {
                return Object.values(districts).reduce(
                  (total: number, subdistricts: any) => {
                    return (
                      total +
                      Object.values(subdistricts).reduce(
                        (subTotal: number, villages: any) => {
                          return (
                            subTotal +
                            Object.values(villages).reduce(
                              (vTotal: number, records: any) => {
                                return (
                                  vTotal +
                                  records.reduce(
                                    (rTotal: number, r: any) => rTotal + r.risk,
                                    0
                                  )
                                );
                              },
                              0
                            )
                          );
                        },
                        0
                      )
                    );
                  },
                  0
                );
              }),
              borderColor: "hsl(var(--warning))",
              backgroundColor: "hsla(var(--warning), 0.1)",
              tension: 0.4,
            },
            {
              label: "ป่วย",
              data: Object.values(groupedData).map((districts: any) => {
                return Object.values(districts).reduce(
                  (total: number, subdistricts: any) => {
                    return (
                      total +
                      Object.values(subdistricts).reduce(
                        (subTotal: number, villages: any) => {
                          return (
                            subTotal +
                            Object.values(villages).reduce(
                              (vTotal: number, records: any) => {
                                return (
                                  vTotal +
                                  records.reduce(
                                    (rTotal: number, r: any) => rTotal + r.sick,
                                    0
                                  )
                                );
                              },
                              0
                            )
                          );
                        },
                        0
                      )
                    );
                  },
                  0
                );
              }),
              borderColor: "hsl(var(--destructive))",
              backgroundColor: "hsla(var(--destructive), 0.1)",
              tension: 0.4,
            },
          ],
        }
      : null;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>สัดส่วนสถานะผู้รับการประเมิน</CardTitle>
          <CardDescription>แบ่งสัดส่วนตามสถานะล่าสุด</CardDescription>
        </CardHeader>
        <CardContent>
          {summary && donutData ? (
            <div className="max-w-md mx-auto">
              <DonutChart data={donutData} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              ไม่มีข้อมูลสำหรับการแสดงในช่วงเวลานี้
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>แนวโน้มข้อมูลตามช่วงเวลา</CardTitle>
          <CardDescription>การเปลี่ยนแปลงรายเดือน</CardDescription>
        </CardHeader>
        <CardContent>
          {lineChartData ? (
            <LineChart data={lineChartData} />
          ) : (
            <p className="text-sm text-muted-foreground">
              ต้องมีข้อมูลหลายช่วงเวลาเพื่อแสดงแนวโน้ม
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
