import { LoadingState } from "@/components/LoadingState";

interface DetailLoadingProps {
  message?: string;
  isOverlay?: boolean;
}

export function DetailLoading({ message = "กำลังโหลดข้อมูล...", isOverlay = false }: DetailLoadingProps) {
  if (isOverlay) {
    return (
      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-20 flex items-center justify-center rounded-lg">
        <LoadingState
          message={message}
          className="bg-white/90 px-8 py-6 rounded-xl shadow-xl"
        />
      </div>
    );
  }

  return <LoadingState message={message} />;
}
