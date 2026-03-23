import { AreaChart, Area, ResponsiveContainer } from 'recharts'

interface SparklineChartProps {
  data: number[]
  color?: string
  width?: number
  height?: number
}

export default function SparklineChart({ data, color = '#3b82f6', width = 80, height = 28 }: SparklineChartProps) {
  if (!data || data.length < 2) return null
  const chartData = data.map((value, index) => ({ index, value }))
  return (
    <div style={{ width, height }} className="shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.1} strokeWidth={2} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
