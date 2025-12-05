/**
 * Curated color palette for family visualization
 * Colors are chosen to be:
 * - Visually distinct
 * - Aesthetically pleasing
 * - Accessible (WCAG compliant)
 * - Work on both light and dark backgrounds
 */
const FAMILY_COLOR_PALETTE = [
  '#8B5CF6', // Violet - warm purple
  '#10B981', // Emerald - fresh green
  '#3B82F6', // Blue - classic blue
  '#F59E0B', // Amber - golden yellow
  '#EF4444', // Red - vibrant red
  '#14B8A6', // Teal - ocean blue-green
  '#F97316', // Orange - energetic orange
  '#EC4899', // Pink - bright pink
  '#6366F1', // Indigo - deep purple-blue
  '#84CC16', // Lime - bright yellow-green
];

/**
 * Generate a color for a family based on its index
 *
 * For the first 10 families, uses curated palette.
 * For 11+ families, generates colors using HSL with spread hues.
 *
 * @param index Family index (0-based)
 * @returns Hex color string (e.g., "#8B5CF6")
 */
export function generateFamilyColor(index: number): string {
  // Use curated palette for first 10 families
  if (index < FAMILY_COLOR_PALETTE.length) {
    return FAMILY_COLOR_PALETTE[index];
  }

  // For 11+ families, generate colors dynamically
  // Use HSL color space for consistent saturation/lightness
  const hue = (index * 137.5) % 360; // Golden angle distribution
  const saturation = 70;
  const lightness = 55;

  return hslToHex(hue, saturation, lightness);
}

/**
 * Convert HSL to Hex color
 *
 * @param h Hue (0-360)
 * @param s Saturation (0-100)
 * @param l Lightness (0-100)
 * @returns Hex color string
 */
function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const rHex = Math.round((r + m) * 255)
    .toString(16)
    .padStart(2, '0');
  const gHex = Math.round((g + m) * 255)
    .toString(16)
    .padStart(2, '0');
  const bHex = Math.round((b + m) * 255)
    .toString(16)
    .padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`.toUpperCase();
}

/**
 * Get all available family colors
 * @returns Array of hex color strings
 */
export function getAllFamilyColors(): string[] {
  return [...FAMILY_COLOR_PALETTE];
}

/**
 * Generate N distinct colors for families
 * @param count Number of colors to generate
 * @returns Array of hex color strings
 */
export function generateFamilyColors(count: number): string[] {
  return Array.from({ length: count }, (_, i) => generateFamilyColor(i));
}
