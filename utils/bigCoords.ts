// Utility for arbitrary-precision coordinates using BigInt
// Allows truly infinite canvas coordinates

export interface BigPoint {
  x: bigint;
  y: bigint;
}

/**
 * Parse string coordinates to BigPoint
 */
export function parseBigPoint(x: string, y: string): BigPoint {
  try {
    return {
      x: BigInt(x || '0'),
      y: BigInt(y || '0'),
    };
  } catch {
    return { x: 0n, y: 0n };
  }
}

/**
 * Convert BigPoint to string representation
 */
export function bigPointToString(p: BigPoint): { x: string; y: string } {
  return { x: p.x.toString(), y: p.y.toString() };
}

/**
 * Calculate relative offset from viewport center
 * Result is clamped to safe rendering range (fits in regular number)
 */
export function getRelativeOffset(
  worldPos: BigPoint,
  viewportCenter: BigPoint
): { x: number; y: number } {
  const dx = worldPos.x - viewportCenter.x;
  const dy = worldPos.y - viewportCenter.y;
  
  // Clamp to safe render distance (items far off-screen don't need precision)
  const MAX_RENDER = 100_000;
  return {
    x: clampBigInt(dx, MAX_RENDER),
    y: clampBigInt(dy, MAX_RENDER),
  };
}

/**
 * Clamp a BigInt to a number within [-max, max]
 */
function clampBigInt(value: bigint, max: number): number {
  const maxBig = BigInt(max);
  if (value > maxBig) return max;
  if (value < -maxBig) return -max;
  return Number(value);
}

/**
 * Add two BigPoints
 */
export function addBigPoints(a: BigPoint, b: BigPoint): BigPoint {
  return { x: a.x + b.x, y: a.y + b.y };
}

/**
 * Subtract BigPoints (a - b)
 */
export function subtractBigPoints(a: BigPoint, b: BigPoint): BigPoint {
  return { x: a.x - b.x, y: a.y - b.y };
}

/**
 * Add a regular number delta to a BigPoint
 */
export function addDeltaToBigPoint(p: BigPoint, dx: number, dy: number): BigPoint {
  return {
    x: p.x + BigInt(Math.round(dx)),
    y: p.y + BigInt(Math.round(dy)),
  };
}

/**
 * Check if a point is within render distance of viewport
 */
export function isInRenderRange(
  worldPos: BigPoint,
  viewportCenter: BigPoint,
  margin: number = 2000
): boolean {
  const dx = worldPos.x - viewportCenter.x;
  const dy = worldPos.y - viewportCenter.y;
  const marginBig = BigInt(margin);
  
  return dx > -marginBig && dx < marginBig && dy > -marginBig && dy < marginBig;
}

/**
 * Calculate bounding box center from BigPoint coordinates
 */
export function getBigBoundingCenter(
  minX: bigint,
  minY: bigint,
  maxX: bigint,
  maxY: bigint
): BigPoint {
  return {
    x: (minX + maxX) / 2n,
    y: (minY + maxY) / 2n,
  };
}

/**
 * Format coordinate as "Sector X +432 000 000 000" with spaces every 3 digits
 */
export function formatSectorCoord(coord: string): string {
  try {
    const num = BigInt(coord);
    const sign = num < 0n ? '–' : '+';
    const abs = num < 0n ? -num : num;
    const str = abs.toString();

    // Add spaces every 3 digits from right to left
    const formatted = str.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

    return `${sign}${formatted}`;
  } catch {
    return '+0';
  }
}

// URL-safe Base64 characters (no +, /, =)
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/**
 * Encode BigInt coordinates into a compact URL-safe string
 * Format: encodes x and y as variable-length base64-like representation
 */
export function encodeCoords(x: string, y: string): string {
  try {
    const xBig = BigInt(x || '0');
    const yBig = BigInt(y || '0');

    const encodeNum = (num: bigint): string => {
      const isNegative = num < 0n;
      let abs = isNegative ? -num : num;

      if (abs === 0n) return '0';

      let result = '';
      const base = 64n;

      while (abs > 0n) {
        result = BASE64_CHARS[Number(abs % base)] + result;
        abs = abs / base;
      }

      return (isNegative ? '-' : '') + result;
    };

    return encodeNum(xBig) + '.' + encodeNum(yBig);
  } catch {
    return '0.0';
  }
}

/**
 * Decode a compact URL string back to BigInt coordinate strings
 */
export function decodeCoords(encoded: string): { x: string; y: string } | null {
  try {
    const parts = encoded.split('.');
    if (parts.length !== 2) return null;

    const decodeNum = (str: string): string => {
      if (str === '0') return '0';

      const isNegative = str.startsWith('-');
      const chars = isNegative ? str.slice(1) : str;

      let result = 0n;
      const base = 64n;

      for (const char of chars) {
        const index = BASE64_CHARS.indexOf(char);
        if (index === -1) return '0';
        result = result * base + BigInt(index);
      }

      return (isNegative ? -result : result).toString();
    };

    return {
      x: decodeNum(parts[0]),
      y: decodeNum(parts[1]),
    };
  } catch {
    return null;
  }
}

