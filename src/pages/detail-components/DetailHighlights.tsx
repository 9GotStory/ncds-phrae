import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { TrendingUp, Award, Stethoscope } from "lucide-react";

interface DetailHighlightsProps {
  quickHighlights: Array<{
    id: string;
    title: string;
    detail: string;
    tone: "muted" | "success" | "warning" | "destructive";
  }>;
  topRiskVillages: Array<{
    village: string;
    subdistrict: string;
    district: string;
    risk: number;
    total: number;
  }>;
  totalRefer: number;
  referLocationsCount: number;
  averageRefer: number;
  selectedMooLabel?: string;
}

export function DetailHighlights({
  quickHighlights,
  topRiskVillages,
  totalRefer,
  referLocationsCount,
  averageRefer,
  selectedMooLabel,
}: DetailHighlightsProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* 1. Highlights */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            ไฮไลต์ล่าสุด
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {quickHighlights.length ? (
            <ul className="space-y-2">
              {quickHighlights.map((item) => {
                const toneClass =
                  item.tone === "success"
                    ? "text-success"
                    : item.tone === "warning"
                    ? "text-warning"
                    : item.tone === "destructive"
                    ? "text-destructive"
                    : "text-muted-foreground";
                return (
                  <li key={item.id} className="text-sm">
                    <p className={`font-semibold ${toneClass}`}>{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.detail}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              เลือกตัวกรองและกดค้นหาเพื่อดูข้อมูลเชิงลึก
            </p>
          )}
        </CardContent>
      </Card>

      {/* 2. Top Risk Areas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-warning" />
            พื้นที่ที่ต้องเฝ้าระวัง
          </CardTitle>
          <CardDescription>5 อันดับแรกตามจำนวนผู้เสี่ยง</CardDescription>
        </CardHeader>
        <CardContent>
          {topRiskVillages.length ? (
            <div className="space-y-3 text-sm">
              {topRiskVillages.map((item, index) => (
                <div
                  key={`${item.district}-${item.subdistrict}-${item.village}-${index}`}
                  className="flex items-start justify-between rounded-md border bg-muted/30 p-3"
                >
                  <div>
                    <p className="font-semibold text-foreground">
                      {index + 1}. {item.village || "ไม่ระบุหมู่บ้าน"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[selectedMooLabel, item.subdistrict, item.district]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-warning">
                      {item.risk.toLocaleString()} คน
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ทั้ง {item.total.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              ยังไม่มีข้อมูลพื้นที่เสี่ยงสำหรับตัวกรองนี้
            </p>
          )}
        </CardContent>
      </Card>

      {/* 3. Referrals */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            การส่งต่อหน่วยบริการ
          </CardTitle>
          <CardDescription>ภาพรวมการส่งต่อในตัวกรองนี้</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {totalRefer > 0 ? (
            <>
              <div className="flex items-center justify-between text-foreground">
                <span>จำนวนส่งต่อทั้งหมด</span>
                <span className="font-semibold text-primary">
                  {totalRefer.toLocaleString()} ครั้ง
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>พื้นที่ที่มีการส่งต่อ</span>
                <span className="font-medium">
                  {referLocationsCount.toLocaleString()} พื้นที่
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>เฉลี่ยต่อพื้นที่</span>
                <span className="font-medium">
                  {averageRefer.toFixed(1)} ครั้ง
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              ยังไม่มีการบันทึกข้อมูลการส่งต่อหน่วยบริการในตัวกรองนี้
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
