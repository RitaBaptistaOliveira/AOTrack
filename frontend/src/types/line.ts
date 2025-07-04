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
