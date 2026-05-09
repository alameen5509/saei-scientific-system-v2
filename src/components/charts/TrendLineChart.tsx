"use client";

// رسم بياني خطي لاتجاه شهري (إنشاء/إنجاز)
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface TrendDatum {
  month: string;
  created: number;
  completed: number;
}

export function TrendLineChart({ data }: { data: TrendDatum[] }) {
  return (
    <div className="h-72 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, left: 12, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E9D5FF" />
          <XAxis
            dataKey="month"
            stroke="#5E5495"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#5E5495"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #E9D5FF",
              fontFamily: "var(--font-cairo), Cairo, sans-serif",
            }}
          />
          <Legend wrapperStyle={{ fontFamily: "var(--font-cairo)" }} />
          <Line
            type="monotone"
            dataKey="created"
            name="مُنشأة"
            stroke="#5E5495"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="completed"
            name="مكتملة"
            stroke="#00D4DD"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
