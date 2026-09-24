/** Quantities keep up to 3 decimals (kilos, liters…), like the API. */
export const roundQuantity = (value: number) => Math.round(value * 1000) / 1000;
