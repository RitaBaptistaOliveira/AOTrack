export interface DataPoint {
    x: number
    y: number
}

export interface Dataset {
    pointId: string | number
    dimId: string | number
    data: DataPoint[]
    color: string
}

export type MultiDataset = Dataset[]
