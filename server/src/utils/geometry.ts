/**
 * Geometric, Spatial & Audio Attenuation Mathematics for ProxiSpeak
 */

import { Position, Obstacle, FurnitureItem } from '@proxispeak/shared';

export interface LineSegment {
  p1: Position;
  p2: Position;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Exact Euclidean Distance on 2D Cartesian plane
 */
export function calculateEuclideanDistance(p1: Position, p2: Position): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate distance-based audio attenuation (0.0 to 1.0)
 * Distance 0 => 1.0
 * Distance 50 => 0.5 (when radius is 100)
 * Distance >= radius => 0.0
 */
export function calculateDistanceAttenuation(
  distance: number,
  radius: number = 100
): number {
  if (distance <= 0) return 1.0;
  if (distance >= radius) return 0.0;
  // Linear attenuation with cosine smoothstep for zero clicks
  const normalized = distance / radius;
  return Math.max(0, Math.min(1, 1 - normalized));
}

/**
 * Calculate stereo panning value between -1.0 (full left) and 1.0 (full right)
 */
export function calculateStereoPan(
  localPos: Position,
  remotePos: Position,
  radius: number = 100
): number {
  const dx = remotePos.x - localPos.x;
  const pan = dx / radius;
  return Math.max(-1.0, Math.min(1.0, pan));
}

/**
 * Check if two 1D intervals [a1, a2] and [b1, b2] overlap
 */
function ccw(a: Position, b: Position, c: Position): number {
  const val = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (Math.abs(val) < 1e-9) return 0; // Collinear
  return val > 0 ? 1 : 2; // Clockwise or Counterclockwise
}

function onSegment(p: Position, q: Position, r: Position): boolean {
  return (
    q.x <= Math.max(p.x, r.x) &&
    q.x >= Math.min(p.x, r.x) &&
    q.y <= Math.max(p.y, r.y) &&
    q.y >= Math.min(p.y, r.y)
  );
}

/**
 * Check if two line segments intersect (p1-p2 and q1-q2)
 */
export function doSegmentsIntersect(
  p1: Position,
  p2: Position,
  q1: Position,
  q2: Position
): boolean {
  const o1 = ccw(p1, p2, q1);
  const o2 = ccw(p1, p2, q2);
  const o3 = ccw(q1, q2, p1);
  const o4 = ccw(q1, q2, p2);

  if (o1 !== o2 && o3 !== o4) {
    return true;
  }

  // Collinear checks
  if (o1 === 0 && onSegment(p1, q1, p2)) return true;
  if (o2 === 0 && onSegment(p1, q2, p2)) return true;
  if (o3 === 0 && onSegment(q1, p1, q2)) return true;
  if (o4 === 0 && onSegment(q1, p2, q2)) return true;

  return false;
}

/**
 * Checks if a line-of-sight segment between two points intersects an axis-aligned rectangular obstacle
 */
export function segmentIntersectsRect(p1: Position, p2: Position, rect: Rectangle): boolean {
  // If either point is strictly inside rectangle
  if (
    p1.x >= rect.x && p1.x <= rect.x + rect.width &&
    p1.y >= rect.y && p1.y <= rect.y + rect.height
  ) return true;

  if (
    p2.x >= rect.x && p2.x <= rect.x + rect.width &&
    p2.y >= rect.y && p2.y <= rect.y + rect.height
  ) return true;

  // Check 4 boundary edges of the rectangle
  const topLeft: Position = { x: rect.x, y: rect.y };
  const topRight: Position = { x: rect.x + rect.width, y: rect.y };
  const bottomLeft: Position = { x: rect.x, y: rect.y + rect.height };
  const bottomRight: Position = { x: rect.x + rect.width, y: rect.y + rect.height };

  return (
    doSegmentsIntersect(p1, p2, topLeft, topRight) ||
    doSegmentsIntersect(p1, p2, topRight, bottomRight) ||
    doSegmentsIntersect(p1, p2, bottomRight, bottomLeft) ||
    doSegmentsIntersect(p1, p2, bottomLeft, topLeft)
  );
}

/**
 * Calculate aggregate sound attenuation factoring in all intersecting obstacles
 */
export function calculateObstacleAttenuation(
  p1: Position,
  p2: Position,
  obstacles: Obstacle[]
): { factor: number; isObstructed: boolean } {
  let obstructionFactor = 1.0; // 1.0 = clear path, 0.0 = completely blocked
  let isObstructed = false;

  for (const obs of obstacles) {
    if (segmentIntersectsRect(p1, p2, obs)) {
      isObstructed = true;
      // Multiply remaining pass-through factor (1.0 - attenuationFactor)
      // e.g. wall with attenuationFactor 1.0 => multiplier 0.0 (silent)
      // glass with attenuationFactor 0.6 => multiplier 0.4
      const passThrough = Math.max(0, 1.0 - obs.attenuationFactor);
      obstructionFactor *= passThrough;
      if (obstructionFactor <= 0.01) {
        obstructionFactor = 0;
        break;
      }
    }
  }

  return { factor: obstructionFactor, isObstructed };
}

/**
 * Collision check for avatar circle of given radius against obstacles and furniture
 */
export function checkCollision(
  pos: Position,
  avatarRadius: number,
  officeDimensions: { width: number; height: number },
  obstacles: Obstacle[],
  furniture: FurnitureItem[]
): boolean {
  // Boundary check
  if (
    pos.x - avatarRadius < 0 ||
    pos.x + avatarRadius > officeDimensions.width ||
    pos.y - avatarRadius < 0 ||
    pos.y + avatarRadius > officeDimensions.height
  ) {
    return true; // Collision with boundary wall
  }

  // Check obstacle collision
  for (const obs of obstacles) {
    if (circleIntersectsRect(pos, avatarRadius, obs)) {
      return true;
    }
  }

  // Check solid furniture collision (e.g. desk, meeting table, bookcase, couch)
  for (const item of furniture) {
    if (item.type !== 'chair' && item.type !== 'plant') { // chairs and small plants are passable/tucked
      if (circleIntersectsRect(pos, avatarRadius, item)) {
        return true;
      }
    }
  }

  return false;
}

function circleIntersectsRect(circle: Position, radius: number, rect: Rectangle): boolean {
  // Find closest point on rectangle to circle center
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

  const distanceX = circle.x - closestX;
  const distanceY = circle.y - closestY;

  return (distanceX * distanceX + distanceY * distanceY) < (radius * radius);
}
