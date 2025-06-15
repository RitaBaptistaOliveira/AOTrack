import * as d3 from "d3"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface DataPoint {
  x: number
  y: number
}

interface StatTableProps {
  data: DataPoint[]
}

export default function StatTable({ data }: StatTableProps) {
  if (!data.length) return null

  const values = data.map((d) => d.y)
  const count = values.length
  const min = d3.min(values)!
  const max = d3.max(values)!
  const mean = d3.mean(values)!
  const median = d3.median(values)!
  const std = d3.deviation(values)!
  const variance = std * std

  const stats = [
    { label: "Count", value: count },
    { label: "Min", value: min.toFixed(2) },
    { label: "Max", value: max.toFixed(2) },
    { label: "Mean", value: mean.toFixed(2) },
    { label: "Median", value: median.toFixed(2) },
    { label: "Std Dev", value: std.toFixed(2) },
    { label: "Variance", value: variance.toFixed(2) },
  ]

  return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Metric</TableHead>
              <TableHead>Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.map((stat) => (
              <TableRow key={stat.label}>
                <TableCell className="font-medium">{stat.label}</TableCell>
                <TableCell>{stat.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
  )
}
