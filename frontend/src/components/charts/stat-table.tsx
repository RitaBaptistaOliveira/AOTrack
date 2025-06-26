import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface StatTableProps {
  data: { max: number, mean: number, median: number, min: number, std: number, variance: number }
  selectedPoint?: { max: number, mean: number, median: number, min: number, std: number, variance: number }
}

export default function StatTable({ data, selectedPoint }: StatTableProps) {

  const stats = [
    { label: "Min", globalValue: data.min, selectedValue: selectedPoint?.min },
    { label: "Max", globalValue: data.max, selectedValue: selectedPoint?.max },
    { label: "Mean", globalValue: data.mean, selectedValue: selectedPoint?.mean },
    { label: "Median", globalValue: data.median, selectedValue: selectedPoint?.median },
    { label: "Std Dev", globalValue: data.std, selectedValue: selectedPoint?.std },
    { label: "Variance", globalValue: data.variance, selectedValue: selectedPoint?.variance },
  ]

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-32">Metric</TableHead>
          <TableHead>Global</TableHead>
          {selectedPoint && <TableHead>Selected Point</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {stats.map((stat) => (
          <TableRow key={stat.label}>
            <TableCell className="font-medium">{stat.label}</TableCell>
            <TableCell>{stat.globalValue.toFixed(0)}</TableCell>
            {selectedPoint && (
              <TableCell>{stat.selectedValue?.toFixed(0)}</TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
