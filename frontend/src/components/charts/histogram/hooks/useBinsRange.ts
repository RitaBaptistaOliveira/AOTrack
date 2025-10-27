import { useEffect, useMemo, useState } from "react"
import type { MultiDataset } from "../../common/utils/types"
import * as d3 from "d3"

export function useBinsRanges(datasets: MultiDataset): { binsRanges: number[], binCount: number | null, setBinCount: (count: number) => void } {
  const [binsRanges, setBinsRanges] = useState<number[]>([])
  const [binCount, setBinCount] = useState<number | null>(null)


  const memoizedDatasets = useMemo(() => {
    return datasets.map((d) => ({
      pointId: d.pointId,
      dimId: d.dimId,
      dataLength: d.data.length,
      dataHash: d.data.map((pt) => pt.y).join(","), // Simple hash of the y values
    }))
  }, [datasets])

  useEffect(() => {
    const values = datasets.flatMap(d => d.data.map(pt => pt.y))
    if (values.length === 0) {
      setBinsRanges([])
      setBinCount(null)
      return
    }
    const domain = d3.extent(values) as [number, number]
    const uniqueBinsMap: Record<number, number> = {}
    const min = Math.max(2, Math.floor(Math.sqrt(values.length)))
    const max = Math.min(200, values.length)

    for (let requested = min; requested <= max; requested++) {
      const generator = d3.bin()
        .domain(domain)
        .thresholds(requested)

      const bins = generator(values)
      const actualBinCount = bins.length

      uniqueBinsMap[actualBinCount] = actualBinCount
    }
    const bins = Object.values(uniqueBinsMap).sort((a, b) => a - b)
    setBinsRanges(bins)

    const gen = d3.bin().domain(domain)
    const thresholds = gen(values).length
    setBinCount(thresholds)

  }, [memoizedDatasets])

  return { binsRanges, binCount, setBinCount }
}


