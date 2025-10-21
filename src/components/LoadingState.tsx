import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState = ({
  message = "กำลังโหลดข้อมูล...",
  className,
}: LoadingStateProps) => {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-3 py-10 text-sm text-muted-foreground",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
      <span>{message}</span>
    </div>
  );
};
