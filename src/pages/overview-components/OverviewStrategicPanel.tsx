import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, Star } from "lucide-react";
import { DistrictListItem } from "./DistrictListItem";

interface DashboardDistrict {
  id: string;
  name: string;
  normal: number;
  risk: number;
  sick: number;
  referCount?: number;
}

interface OverviewStrategicPanelProps {
  areasNeedingSupport: DashboardDistrict[];
  modelCommunities: DashboardDistrict[];
  detailTable: Array<{
    district: string;
    subdistrict: string;
    village: string;
    moo?: string;
    normal: number;
    risk: number;
    sick: number;
  }>;
}

export function OverviewStrategicPanel({
  areasNeedingSupport,
  modelCommunities,
  detailTable,
}: OverviewStrategicPanelProps) {
  return (
    <div className="space-y-6">
      {/* Red Zone: Areas Needing Support */}
      <Card className="border-l-4 border-l-orange-500 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
            <AlertCircle className="h-5 w-5" />
            พื้นที่ที่น่าเป็นห่วง (Monitor)
          </CardTitle>
          <CardDescription>
            พื้นที่ที่มีสัดส่วนกลุ่มเสี่ยงสูง
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {areasNeedingSupport.map((d, i) => (
            <DistrictListItem
              key={d.name}
              district={d}
              index={i}
              type="monitor"
              detailRows={detailTable}
            />
          ))}
        </CardContent>
      </Card>

      {/* Green Zone: Model Communities */}
      <Card className="border-l-4 border-l-emerald-500 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2 text-emerald-700">
            <Star className="h-5 w-5" />
            พื้นที่ต้นแบบ (Model Communities)
          </CardTitle>
          <CardDescription>
            พื้นที่จัดการสุขภาพได้ดีเยี่ยม
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {modelCommunities.map((d, i) => (
            <DistrictListItem
              key={d.name}
              district={d}
              index={i}
              type="model"
              detailRows={detailTable}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
