interface OverviewHeaderProps {
  period?: string | number;
}

export function OverviewHeader({ period }: OverviewHeaderProps) {
  const displayPeriod = period || new Date().getFullYear() + 543;

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          NCDs Prevention Center
        </h1>
        <p className="text-slate-500 mt-1">
          ภาพรวมระบบ • การเฝ้าระวังโรคไม่ติดต่อเรื้อรัง จังหวัดแพร่
        </p>
      </div>
      <div className="text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-lg shadow-sm border">
        ข้อมูลประจำปีงบประมาณ:{" "}
        <span className="font-bold text-slate-700">{displayPeriod}</span>
      </div>
    </div>
  );
}
