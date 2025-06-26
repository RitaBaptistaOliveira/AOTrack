import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface StatProps {
  min: [number, number]
  max: [number, number]
  mean: [number, number]
  median: [number, number]
  std: [number, number]
  variance: [number, number]
}

interface StatTableProps {
  data: StatProps
  selectedPoint?: StatProps
}

export default function DualStatTable({ data, selectedPoint }: StatTableProps) {

  const stats = [
    { label: "Min", X: data.min[0], Y: data.min[1], selectedValueX: selectedPoint?.min[0], selectedValueY: selectedPoint?.min[1] },
    { label: "Max", X: data.max[0], Y: data.max[1], selectedValueX: selectedPoint?.max[0], selectedValueY: selectedPoint?.max[1] },
    { label: "Mean", X: data.mean[0], Y: data.mean[1], selectedValueX: selectedPoint?.mean[0], selectedValueY: selectedPoint?.mean[1] },
    { label: "Median", X: data.median[0], Y: data.median[1], selectedValueX: selectedPoint?.median[0], selectedValueY: selectedPoint?.median[1] },
    { label: "Std Dev", X: data.std[0], Y: data.std[1], selectedValueX: selectedPoint?.std[0], selectedValueY: selectedPoint?.std[1] },
    { label: "Variance", X: data.variance[0], Y: data.variance[1], selectedValueX: selectedPoint?.variance[0], selectedValueY: selectedPoint?.variance[1] },
  ]

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-32">Metric</TableHead>
          <TableHead>X (Global)</TableHead>
          <TableHead>Y (Global)</TableHead>
          {selectedPoint && (
            <>
              <TableHead>X (Selected)</TableHead>
              <TableHead>Y (Selected)</TableHead>
            </>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {stats.map((stat) => (
          <TableRow key={stat.label}>
            <TableCell className="font-medium">{stat.label}</TableCell>
            <TableCell>{stat.X.toFixed(4)}</TableCell>
            <TableCell>{stat.Y.toFixed(4)}</TableCell>
            {selectedPoint && (
              <>
                <TableCell>{stat.selectedValueX?.toFixed(4) ?? "-"}</TableCell>
                <TableCell>{stat.selectedValueY?.toFixed(4) ?? "-"}</TableCell>
              </>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
