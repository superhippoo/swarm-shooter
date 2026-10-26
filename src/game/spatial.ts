export class SpatialHash<T> {
  private readonly cells = new Map<number, T[]>();

  constructor(private readonly cellSize = 128) {}

  clear(): void {
    for (const cell of this.cells.values()) {
      cell.length = 0;
    }
  }

  insert(value: T, x: number, y: number): void {
    const key = this.key(Math.floor(x / this.cellSize), Math.floor(y / this.cellSize));
    const cell = this.cells.get(key);
    if (cell) cell.push(value);
    else this.cells.set(key, [value]);
  }

  query(
    left: number,
    top: number,
    right: number,
    bottom: number,
    output: T[],
  ): T[] {
    output.length = 0;
    const minCellX = Math.floor(left / this.cellSize);
    const maxCellX = Math.floor(right / this.cellSize);
    const minCellY = Math.floor(top / this.cellSize);
    const maxCellY = Math.floor(bottom / this.cellSize);
    for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
      for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        const cell = this.cells.get(this.key(cellX, cellY));
        if (!cell) continue;
        for (const value of cell) output.push(value);
      }
    }
    return output;
  }

  private key(x: number, y: number): number {
    return (x + 32_768) * 65_536 + y + 32_768;
  }
}
