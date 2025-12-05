/**
 * Layout and rendering constants for the family tree visualization
 */

export const LAYOUT_CONSTANTS = {
    /** Size of tree nodes in pixels */
    NODE_SIZE: 28,

    /** Horizontal spacing between nodes */
    NODE_SPACING_X: 100,

    /** Vertical spacing between nodes (generation separation) */
    NODE_SPACING_Y: 100,

    /** Duration of animations and transitions in milliseconds */
    TRANSITION_DURATION_MS: 500,

    /** Default birth year when parsing fails or data is missing */
    DEFAULT_BIRTH_YEAR: 1980,

    /** Maximum length of text labels before truncation */
    MAX_LABEL_LENGTH: 40,

    /** Vertical separation between label lines */
    LABEL_LINE_SEPARATION: 14,

    /** Number of relaxation passes for layout optimization */
    RELAXATION_PASSES: 8,
} as const;

// Type-safe access to constants
export type LayoutConstants = typeof LAYOUT_CONSTANTS;
