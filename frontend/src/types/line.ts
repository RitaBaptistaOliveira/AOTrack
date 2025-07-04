export interface DataPoint {
  x: number
  y: number
}

export interface LineConfig {
  col: number
  row: number
}

export interface D3LineChartProps {
  data1?: DataPoint[]
  data2?: DataPoint[]
  config1?: LineConfig
  config2?: LineConfig
}

export interface ChartStatistics {
  min: number
  max: number
  avg: number
  count: number
}

export interface ChartDataset {
  data: DataPoint[]
  config?: LineConfig
  key: string
  color: string
  name: string
}

export interface ChartTooltipData {
  x: number
  y: number
  color: string
  line: string
}
