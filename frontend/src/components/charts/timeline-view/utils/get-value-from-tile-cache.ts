export function getValueFromTileCache(frame: number, index: number, dim: number, tileSize: number, tileCache: any): number[] | undefined {
        const frameTile = Math.floor(frame / tileSize) * tileSize
        const indexTile = Math.floor(index / tileSize) * tileSize

        const values: number[] = []
        const i = frame - frameTile
        const j = index - indexTile

        for (let d = 0; d < dim; d++) {
            const key = `${frameTile}-${frameTile + tileSize}:${indexTile}-${indexTile + tileSize}:${d}`
            const tile = tileCache.current.get(key)
            if (!tile) return undefined


            values.push(tile.tile[i][j])
        }

        return values
    }