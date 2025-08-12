import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type StatValue = number | number[]

interface StatData {
  min: StatValue
  max: StatValue
  mean: StatValue
  median: StatValue
  std: StatValue
  variance: StatValue
}

interface StatTableProps {
  data: StatData
  selectedPoint?: StatData
}

export default function StatTable({ data, selectedPoint }: StatTableProps) {

  const stats = [
    { label: "Min", key: "min" },
    { label: "Max", key: "max" },
    { label: "Mean", key: "mean" },
    { label: "Median", key: "median" },
    { label: "Std Dev", key: "std" },
    { label: "Variance", key: "variance" },
  ] as const

  const axisLabels = ["X", "Y", "Z", "W"]

  const getValuesArray = (val: StatValue): number[] =>
    Array.isArray(val) ? val : [val]

  const axisCount = getValuesArray(data.min).length

  const getAxisLabel = (index: number) =>
    axisLabels[index] ?? `Axis ${index + 1}`

  const formatValue = (val?: number) =>
    val !== undefined ? val.toFixed(axisCount > 1 ? 4 : 3) : "-"

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-32">Metric</TableHead>
          {Array.from({ length: axisCount }, (_, i) => (
            <TableHead key={`global-${i}`}>
              {axisCount > 1
                ? `${getAxisLabel(i)} (Global)`
                : "Global"}
            </TableHead>
          ))}
          {selectedPoint &&
            Array.from({ length: axisCount }, (_, i) => (
              <TableHead key={`selected-${i}`}>
                {axisCount > 1
                  ? `${getAxisLabel(i)} (Selected)`
                  : "Selected"}
              </TableHead>
            ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {stats.map(({ label, key }) => {
          const globalVals = getValuesArray(data[key])
          const selectedVals = selectedPoint
            ? getValuesArray(selectedPoint[key])
            : []

          return (
            <TableRow key={label}>
              <TableCell className="font-medium">{label}</TableCell>


              {globalVals.map((v, i) => (
                <TableCell key={`g-${key}-${i}`}>{formatValue(v)}</TableCell>
              ))}

              {/* Selected values */}
              {selectedPoint &&
                selectedVals.map((v, i) => (
                  <TableCell key={`s-${key}-${i}`}>{formatValue(v)}</TableCell>
                ))}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
