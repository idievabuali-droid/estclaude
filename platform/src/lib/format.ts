/**
 * Format helpers for prices, sizes, and other display values.
 * All numeric outputs are designed for tabular-nums display.
 */

const PRICE_FORMATTER = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 0,
});

const M2_FORMATTER = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 1,
});

/** Convert dirams (1 TJS = 100 dirams) to TJS string with thin-space grouping. */
export function formatPriceTJS(priceDirams: bigint | number): string {
  const tjs = typeof priceDirams === 'bigint' ? Number(priceDirams) / 100 : priceDirams / 100;
  return `${PRICE_FORMATTER.format(Math.round(tjs))} TJS`;
}

/** Convert dirams to a "1 200 000" style string without currency suffix. */
export function formatPriceNumber(priceDirams: bigint | number): string {
  const tjs = typeof priceDirams === 'bigint' ? Number(priceDirams) / 100 : priceDirams / 100;
  return PRICE_FORMATTER.format(Math.round(tjs));
}

export function formatM2(sizeM2: number): string {
  return `${M2_FORMATTER.format(sizeM2)} м²`;
}

export function formatFloor(floor: number, totalFloors: number | null): string {
  return totalFloors ? `${floor}/${totalFloors}` : String(floor);
}
