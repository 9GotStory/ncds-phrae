import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

export interface HeatMapDistrict {
  id: string;
  name: string;
  normal: number;
  risk: number;
  sick: number;
  x: number;
  y: number;
}

const DEFAULT_DISTRICTS: HeatMapDistrict[] = [
  { id: "1", name: "เมืองแพร่", normal: 3200, risk: 850, sick: 420, x: 180, y: 200 },
  { id: "2", name: "สอง", normal: 1800, risk: 520, sick: 180, x: 120, y: 150 },
  { id: "3", name: "เด่นชัย", normal: 2100, risk: 680, sick: 290, x: 280, y: 180 },
  { id: "4", name: "ลอง", normal: 1500, risk: 420, sick: 150, x: 220, y: 120 },
  { id: "5", name: "สูงเม่น", normal: 1200, risk: 380, sick: 120, x: 320, y: 240 },
  { id: "6", name: "วังชิ้น", normal: 980, risk: 290, sick: 95, x: 140, y: 280 },
  { id: "7", name: "ร้องกวาง", normal: 1100, risk: 340, sick: 110, x: 240, y: 260 },
  { id: "8", name: "หนองม่วงไข่", normal: 850, risk: 250, sick: 85, x: 80, y: 220 },
];

interface HeatMapProps {
  districts?: HeatMapDistrict[];
  onSelectDistrict?: (district: HeatMapDistrict) => void;
}

export const HeatMap = ({ districts: districtsProp, onSelectDistrict }: HeatMapProps) => {
  const [hoveredDistrict, setHoveredDistrict] = useState<HeatMapDistrict | null>(null);

  const districts = districtsProp?.length ? districtsProp : DEFAULT_DISTRICTS;

  const getColor = (district: HeatMapDistrict) => {
    const total = district.normal + district.risk + district.sick;
    const riskPercentage = ((district.risk + district.sick) / total) * 100;
    
    if (riskPercentage < 20) return 'hsl(var(--success))';
    if (riskPercentage < 40) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  return (
    <div className="relative w-full aspect-video bg-gradient-to-br from-muted/30 to-muted/10 rounded-lg border">
      <svg viewBox="0 0 400 320" className="w-full h-full">
        {/* Province outline */}
        <path
          d="M 50,100 L 100,50 L 200,60 L 300,80 L 350,140 L 340,240 L 280,300 L 180,310 L 100,280 L 60,200 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="2"
          opacity="0.3"
        />

        {/* District circles */}
        {districts.map((district) => (
          <g key={district.id}>
            <circle
              cx={district.x}
              cy={district.y}
              r={hoveredDistrict?.id === district.id ? 28 : 24}
              fill={getColor(district)}
              opacity={hoveredDistrict?.id === district.id ? 0.9 : 0.7}
              stroke="hsl(var(--background))"
              strokeWidth="2"
              onMouseEnter={() => setHoveredDistrict(district)}
              onMouseLeave={() => setHoveredDistrict(null)}
              onClick={() => onSelectDistrict?.(district)}
              className="cursor-pointer transition-all duration-200"
            />
            <text
              x={district.x}
              y={district.y + 5}
              textAnchor="middle"
              fill="hsl(var(--background))"
              fontSize="11"
              fontWeight="bold"
              className="pointer-events-none"
            >
              {district.name}
            </text>
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {hoveredDistrict && (
        <Card className="absolute top-4 right-4 w-56 shadow-lg z-10">
          <CardContent className="p-4">
            <h4 className="font-bold text-lg mb-2">{hoveredDistrict.name}</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-success">ปกติ:</span>
                <span className="font-medium">{hoveredDistrict.normal.toLocaleString()} คน</span>
              </div>
              <div className="flex justify-between">
                <span className="text-warning">เสี่ยง:</span>
                <span className="font-medium">{hoveredDistrict.risk.toLocaleString()} คน</span>
              </div>
              <div className="flex justify-between">
                <span className="text-destructive">ป่วย:</span>
                <span className="font-medium">{hoveredDistrict.sick.toLocaleString()} คน</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 border">
        <div className="text-xs font-medium mb-2">ระดับความเสี่ยง</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span>ต่ำ (&lt;20%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span>ปานกลาง (20-40%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span>สูง (&gt;40%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
