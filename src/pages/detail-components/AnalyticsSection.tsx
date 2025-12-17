import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DonutChart } from "@/components/charts/DonutChart";
import { LineChart } from "@/components/charts/LineChart";
import { DashboardChartData } from "@/services/googleSheetsApi";

interface AnalyticsSectionProps {
  donutData: any;
  lineChartData?: DashboardChartData;
}

export function AnalyticsSection({
  donutData,
  lineChartData,
}: AnalyticsSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Donut Chart - 1 Column */}
      <Card className="lg:col-span-1 border-none shadow-md">
        <CardHeader>
          <CardTitle>สัดส่วนภาพรวม</CardTitle>
          <CardDescription>การกระจายตัวของกลุ่มเป้าหมาย</CardDescription>
        </CardHeader>
        <CardContent>
          {donutData ? (
            <div className="aspect-square max-h-[300px] mx-auto relative flex items-center justify-center">
              <DonutChart data={donutData} />
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-muted-foreground">
              ไม่มีข้อมูล
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Chart - 2 Columns */}
      <Card className="lg:col-span-2 border-none shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>แนวโน้มการเปลี่ยนแปลง</CardTitle>
              <CardDescription>ติดตามผลการดำเนินงานรายเดือน</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {lineChartData ? (
            <div className="h-[300px] w-full">
              <LineChart data={lineChartData} />
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              ต้องการข้อมูลหลายช่วงเวลา
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
