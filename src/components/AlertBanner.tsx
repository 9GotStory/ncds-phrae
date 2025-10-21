import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, X } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { googleSheetsApi, type AlertRecord } from "@/services/googleSheetsApi";

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const formatAlertPeriod = (alert: AlertRecord) => {
  if (typeof alert.month === "number" && typeof alert.year === "number") {
    const monthIndex = alert.month - 1;
    const monthName = THAI_MONTHS[monthIndex] ?? String(alert.month);
    return `${monthName} ${alert.year}`;
  }

  if (alert.createdAt) {
    const date = new Date(alert.createdAt);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "2-digit",
      });
    }
  }

  return undefined;
};

export const AlertBanner = () => {
  const [dismissed, setDismissed] = useState(false);

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["alerts", "pending"],
    queryFn: () =>
      googleSheetsApi.getAlerts({
        status: "pending",
        limit: 10,
      }),
    staleTime: 60 * 1000,
  });

  if (dismissed) {
    return null;
  }

  if (isError) {
    const message =
      error instanceof Error
        ? error.message
        : "ไม่สามารถโหลดข้อมูลแจ้งเตือนพื้นที่ได้";

    return (
      <Alert variant="default" className="mb-6 border-warning/60 bg-warning/10">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertTitle className="flex flex-wrap items-center justify-between gap-2 text-warning">
          <span>ไม่สามารถโหลดข้อมูลแจ้งเตือนพื้นที่ได้</span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="gap-2"
            >
              {isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              ลองใหม่
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissed(true)}
              className="h-auto p-1 hover:bg-warning/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertTitle>
        <AlertDescription className="mt-2 text-sm text-warning-foreground">
          {message}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading || !data) {
    return null;
  }

  const alerts = data.alerts ?? [];
  if (alerts.length === 0) {
    return null;
  }

  const pendingCount = data.pendingCount ?? alerts.length;

  return (
    <Alert variant="default" className="mb-6 border-warning/70 bg-warning/10">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertTitle className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>พื้นที่ที่ควรจับตา</span>
          <Badge variant="secondary" className="uppercase tracking-wide">
            แจ้งเตือน {pendingCount.toLocaleString()} รายการ
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
          className="h-auto p-1 hover:bg-warning/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-3">
          {alerts.map((alert) => {
            const periodLabel = formatAlertPeriod(alert);
            const locationParts = [
              alert.district,
              alert.subdistrict,
              alert.village,
            ].filter(Boolean);

            return (
              <div key={alert.id} className="text-sm">
                <div className="font-medium text-warning-foreground">
                  {locationParts.length > 0
                    ? locationParts.join(" · ")
                    : alert.alertType || "พื้นที่ไม่ระบุ"}
                  {periodLabel ? ` · ช่วง ${periodLabel}` : ""}
                </div>
                {alert.message ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {alert.message}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-xs opacity-90 text-warning-foreground">
          โปรดประสานทีมพื้นที่เพื่อเร่งติดตามสถานการณ์และปรับมาตรการที่เกี่ยวข้อง
        </div>
      </AlertDescription>
    </Alert>
  );
};
