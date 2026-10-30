/**
 * 2D Planar Spatial Grid (Uniform Bucket Spatial Index)
 * Optimized for Cartesian pixel coordinates in virtual office environments.
 * Provides O(1) average-time neighbor candidate queries.
 */

import { Position } from '@proxispeak/shared';

export interface GridEntity {
  id?: string;
  userId?: string;
  position: Position;
}

export class SpatialGrid<T extends GridEntity> {
  private cellSize: number;
  // Key: "cellX:cellY", Value: Set of entity IDs
  private cells: Map<string, Set<string>> = new Map();
  // Key: entity ID, Value: entity data & current cell key
  private entities: Map<string, { entity: T; cellKey: string }> = new Map();

  constructor(cellSize: number = 100) {
    this.cellSize = cellSize;
  }

  private getEntityId(entity: T): string {
    return (entity.id || entity.userId || '') as string;
  }

  private getCellKey(pos: Position): string {
    const cellX = Math.floor(pos.x / this.cellSize);
    const cellY = Math.floor(pos.y / this.cellSize);
    return `${cellX}:${cellY}`;
  }

  /**
   * Insert or update an entity's position in the grid
   */
  public update(entity: T): void {
    const id = this.getEntityId(entity);
    const existing = this.entities.get(id);
    const newCellKey = this.getCellKey(entity.position);

    if (existing) {
      if (existing.cellKey !== newCellKey) {
        // Entity moved to a different cell
        const oldCell = this.cells.get(existing.cellKey);
        if (oldCell) {
          oldCell.delete(id);
          if (oldCell.size === 0) {
            this.cells.delete(existing.cellKey);
          }
        }
        let cell = this.cells.get(newCellKey);
        if (!cell) {
          cell = new Set();
          this.cells.set(newCellKey, cell);
        }
        cell.add(id);
        this.entities.set(id, { entity, cellKey: newCellKey });
      } else {
        // Same cell, just update object reference
        existing.entity = entity;
      }
    } else {
      // New entity
      let cell = this.cells.get(newCellKey);
      if (!cell) {
        cell = new Set();
        this.cells.set(newCellKey, cell);
      }
      cell.add(id);
      this.entities.set(id, { entity, cellKey: newCellKey });
    }
  }

  /**
   * Remove an entity from the grid
   */
  public remove(entityId: string): void {
    const existing = this.entities.get(entityId);
    if (!existing) return;

    const cell = this.cells.get(existing.cellKey);
    if (cell) {
      cell.delete(entityId);
      if (cell.size === 0) {
        this.cells.delete(existing.cellKey);
      }
    }
    this.entities.delete(entityId);
  }

  /**
   * Query nearby candidate entities within neighboring grid cells
   */
  public getCandidates(pos: Position, searchRadius: number): T[] {
    const centerCellX = Math.floor(pos.x / this.cellSize);
    const centerCellY = Math.floor(pos.y / this.cellSize);
    const cellSpan = Math.ceil(searchRadius / this.cellSize);

    const candidates: T[] = [];
    const seenIds = new Set<string>();

    for (let dx = -cellSpan; dx <= cellSpan; dx++) {
      for (let dy = -cellSpan; dy <= cellSpan; dy++) {
        const key = `${centerCellX + dx}:${centerCellY + dy}`;
        const cell = this.cells.get(key);
        if (cell) {
          for (const id of cell) {
            if (!seenIds.has(id)) {
              seenIds.add(id);
              const data = this.entities.get(id);
              if (data) {
                candidates.push(data.entity);
              }
            }
          }
        }
      }
    }

    return candidates;
  }

  public getEntity(id: string): T | undefined {
    return this.entities.get(id)?.entity;
  }

  public getAll(): T[] {
    return Array.from(this.entities.values()).map((v) => v.entity);
  }

  public clear(): void {
    this.cells.clear();
    this.entities.clear();
  }

  public size(): number {
    return this.entities.size;
  }
}
