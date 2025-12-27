interface DetailErrorProps {
  message?: string;
}

export function DetailError({ message }: DetailErrorProps) {
  return (
    <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg text-center flex flex-col items-center">
      <span className="font-semibold">ไม่สามารถโหลดข้อมูลได้</span>
      <span className="text-sm mt-1 opacity-80">
        {message || "เกิดข้อผิดพลาดในการโหลดข้อมูล"}
      </span>
    </div>
  );
}
