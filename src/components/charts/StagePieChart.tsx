"use client";

// رسم دائري لتوزيع المراحل — تركوازي/بنفسجي/ذهبي ساعي
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export interface PieDatum {
  label: string;
  value: number;
  pct?: number;
}

// لوحة ألوان متناغمة مع هوية ساعي — تتدرّج عبر 12 شريحة
const COLORS = [
  "#5E5495", // saei-purple
  "#00D4DD", // saei-teal/cyan
  "#C9A84C", // saei-gold
  "#0EA5E9", // sky
  "#7C3AED", // violet
  "#06B6D4", // cyan-500
  "#F59E0B", // amber
  "#10B981", // emerald
  "#EC4899", // pink
  "#3B82F6", // blue
  "#8B5CF6", // purple-500
  "#14B8A6", // teal-500
];

export function StagePieChart({ data }: { data: PieDatum[] }) {
  const total = data.reduce((s, x) => s + x.value, 0);
  const enriched = data.map((d) => ({
    ...d,
    pct: total > 0 ? Math.round((d.value / total) * 100) : 0,
  }));

  return (
    <div className="h-80 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={enriched}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            outerRadius={100}
            innerRadius={50}
            paddingAngle={2}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            label={(entry: any) =>
              entry?.pct != null ? `${entry.pct}%` : ""
            }
          >
            {enriched.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #E9D5FF",
              fontFamily: "var(--font-cairo), Cairo, sans-serif",
            }}
          />
          <Legend
            verticalAlign="bottom"
            wrapperStyle={{
              fontFamily: "var(--font-cairo)",
              fontSize: 11,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
