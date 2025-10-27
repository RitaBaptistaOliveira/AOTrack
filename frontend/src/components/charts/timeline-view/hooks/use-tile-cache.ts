import { useRef, useCallback, useEffect, useState } from "react"

interface Tile {
  canvas: HTMLCanvasElement
  frameStart: number
  indexStart: number
  tile: number[][]
  lastUsed: number
}

export function useTileCache(dim: number, cellSize: number, interpolator: (v: number) => string, onFetchTile: (...args: any[]) => Promise<number[][][]>) {
  const tileCache = useRef(new Map<string, Tile>())
  const [cacheVersion, setCacheVersion] = useState(0)
  const requestedTiles = useRef(new Set<string>())
  const pendingTiles = useRef(new Set<string>())
  const MAX_CONCURRENT = 4
  const activeRequests = useRef(0)

  const queueTiles = useCallback((tiles: { key: string, frameStart: number, frameEnd: number, indexStart: number, indexEnd: number }[]) => {
    tiles.forEach(tile => {
      for (let d = 0; d < dim; d++) {
        const key = `${tile.key}:${d}`
        if (!tileCache.current.has(key) && !requestedTiles.current.has(key)) {
          pendingTiles.current.add(tile.key)
        }
      }
    })
  }, [dim])

  const fetchAndRenderTile = useCallback(async (frameStart: number, frameEnd: number, indexStart: number, indexEnd: number) => {
    const keys: string[] = []
    const regionKey = `${frameStart}-${frameEnd}:${indexStart}-${indexEnd}`
    for (let d = 0; d < dim; d++) {
      const key = `${regionKey}:${d}`
      if (tileCache.current.has(key)) continue
      keys.push(key)
      requestedTiles.current.add(key)
    }
    if (keys.length === 0) {
      pendingTiles.current.delete(regionKey)
      return
    }

    try {
      const tiles = await onFetchTile(frameStart, frameEnd, indexStart, indexEnd)
      for (let d = 0; d < dim; d++) {
        const canvas = document.createElement("canvas")
        const tile = tiles[d]
        if (!tile || !tile.length) {
          tileCache.current.set(keys[d], { canvas, frameStart, indexStart, tile: [], lastUsed: 0})
          continue
        }
        canvas.width = tile.length * cellSize
        canvas.height = tile[0].length * cellSize
        const ctx = canvas.getContext("2d")!
        for (let i = 0; i < tile.length; i++) {
          for (let j = 0; j < tile[i].length; j++) {
            ctx.fillStyle = interpolator(tile[i][j])
            ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize)
          }
        }
        tileCache.current.set(keys[d], { canvas, frameStart, indexStart, tile, lastUsed: Date.now() })
      }
    } finally {
      setCacheVersion(v => v + 1)
      keys.forEach(key => requestedTiles.current.delete(key))
      pendingTiles.current.delete(regionKey)
    }
  }, [dim, cellSize, interpolator, onFetchTile])

  // drain pending queue
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeRequests.current >= MAX_CONCURRENT) return

      const iterator = pendingTiles.current.values()
      const next = iterator.next()
      if (next.done) return
      const regionKey = next.value
      const [frameRange, indexRange] = regionKey.split(":")
      const [frameStart, frameEnd] = frameRange.split("-").map(Number)
      const [indexStart, indexEnd] = indexRange.split("-").map(Number)
      activeRequests.current++

      fetchAndRenderTile(frameStart, frameEnd, indexStart, indexEnd)
        .finally(() => {
          activeRequests.current--
        })
    }, 100)

    return () => clearInterval(interval)
  }, [fetchAndRenderTile])

  return { tileCache, queueTiles, cacheVersion }
}
