/**
 * Utility functions to replace @1inch/byte-utils dependency
 */

/**
 * Convert a Uint8Array to a hex string
 * @param bytes - The Uint8Array to convert
 * @returns The hex string representation
 */
export function uint8ArrayToHex(bytes: Uint8Array): string {
  return (
    "0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Maximum value for a 40-bit unsigned integer
 */
export const UINT_40_MAX = BigInt("0xFFFFFFFFFF"); // 2^40 - 1
