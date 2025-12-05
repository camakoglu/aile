import * as d3 from 'd3';
import { D3Node } from '../../types/types';
import { is_member, get_death_date, get_image_path, get_gender } from './dagWithFamilyData';
import { LAYOUT_CONSTANTS } from '../../constants/layout';

// Default color for nodes without families or when family filtering is disabled
const DEFAULT_NODE_COLOR = '#9CA3AF'; // Gray

export function get_node_size() {
    return LAYOUT_CONSTANTS.NODE_SIZE;
}

export function get_css_class(node: D3Node) {
    if (!is_member(node)) return "family";
    let cssClass = "member";
    if (!node.added_data.is_highlighted) {
        cssClass += " non-highlighted";
    } else {
        cssClass += " highlighted";
    }
    if (get_death_date(node)) {
        cssClass += " deceased";

        // Check if node has children
        const children = node.children ? node.children() : [];
        const hasChildren = children.length > 0;

        // Check if any children are visible (node is uncollapsed)
        const hasVisibleChildren = hasChildren && children.some(child => child.added_data.is_visible);

        // If node has no children OR is uncollapsed, use less prominent styling
        if (!hasChildren || hasVisibleChildren) {
            cssClass += " deceased-uncollapsed";
        }
    }
    return cssClass;
}

export function add_images(group: d3.Selection<SVGGElement, D3Node, SVGGElement, unknown>) {
    function get_clip_path_id(node: D3Node) {
        return "clip_to_circle_" + node.data;
    };
    group.append("defs")
        .append("clipPath")
        .attr("id", node => get_clip_path_id(node))
        .append("circle")
        .attr("r", get_node_size() - 1.0);
    let image_size = 2.0 * get_node_size();
    
    // Only add image if path exists
    group.filter(node => get_image_path(node) !== "")
        .append("image")
        .attr("x", -image_size / 2.0)
        .attr("y", -image_size / 2.0)
        .attr("width", image_size)
        .attr("height", image_size)
        .attr("href", node => get_image_path(node))
        .attr("referrerpolicy", "no-referrer")
        .attr("clip-path", node => "url(#" + get_clip_path_id(node) + ")")
        .attr("cursor", "pointer");

    // Add crescent symbol if deceased and NO image
    group.filter(node => get_image_path(node) === "" && get_death_date(node) !== "")
        .append("text")
        .attr("class", "deceased-symbol")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("font-size", get_node_size() * 1.0)
        .attr("dy", "0em") // vertical adjustment to center
        .attr("fill", "#FFFFFF") // This might not affect all emojis, but keeping it
        .style("filter", "grayscale(70%)") // Force black and white with 70% intensity
        .style("pointer-events", "none")
        .text("🕊️"); // Changed from 🪦 to 🕊️

    // Add gender symbol if not deceased, NO image, and is a member
    group.filter(node => get_image_path(node) === "" && get_death_date(node) === "" && is_member(node))
        .append("text")
        .attr("class", "gender-symbol")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("font-size", get_node_size() * 1.0)
        .attr("dy", "0em")
        .attr("fill", "#FFFFFF") // White for consistency
        .style("filter", "grayscale(70%)") // Apply grayscale filter with 70% intensity
        .style("pointer-events", "none")
        .text(node => {
            const gender = get_gender(node);
            if (gender === 'E') return '👔'; // Male is Necktie
            if (gender === 'K') return '🎀'; // Female is Ribbon Bow
            return '👤'; // Default for unknown/other gender
        });
}

// ========== Family Filtering Functions ==========

/**
 * Get fill color/gradient for a node based on family membership
 * @param node D3 node
 * @param memberToFamilies Map of member ID to family IDs
 * @param familyColors Map of family ID to color
 * @param svgDefs SVG defs element for creating gradients
 * @returns Color string or URL to gradient
 */
export function getNodeFill(
    node: D3Node,
    memberToFamilies: Map<string, string[]>,
    familyColors: Map<string, string>,
    svgDefs: d3.Selection<SVGDefsElement, unknown, null, undefined>
): string {
    // Union nodes don't get family colors
    if (!is_member(node)) {
        return DEFAULT_NODE_COLOR;
    }

    const nodeFamilies = memberToFamilies.get(node.data) || [];

    // No families: use default color
    if (nodeFamilies.length === 0) {
        return DEFAULT_NODE_COLOR;
    }

    // Single family: use solid color
    if (nodeFamilies.length === 1) {
        return familyColors.get(nodeFamilies[0]) || DEFAULT_NODE_COLOR;
    }

    // Multiple families: create gradient
    const gradientId = `gradient-${node.data.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const colors = nodeFamilies.map(f => familyColors.get(f)).filter(c => c !== undefined) as string[];

    if (colors.length === 0) {
        return DEFAULT_NODE_COLOR;
    }

    createLinearGradient(svgDefs, gradientId, colors);
    return `url(#${gradientId})`;
}

/**
 * Get opacity for a node based on family filtering
 * @param node D3 node
 * @param memberToFamilies Map of member ID to family IDs
 * @param activeFamilyIds Set of active family IDs
 * @returns Opacity value (0.0 - 1.0)
 */
export function getNodeOpacity(
    node: D3Node,
    memberToFamilies: Map<string, string[]>,
    activeFamilyIds: Set<string>
): number {
    // Union nodes follow their parent's opacity
    if (!is_member(node)) {
        return 1.0; // Will be handled by link opacity
    }

    const nodeFamilies = memberToFamilies.get(node.data) || [];

    // Nodes without families are always visible
    if (nodeFamilies.length === 0) {
        return 1.0;
    }

    // Check if node belongs to any active family
    const hasActiveFamily = nodeFamilies.some(f => activeFamilyIds.has(f));

    return hasActiveFamily ? 1.0 : 0.25; // Dim inactive families to 25%
}

/**
 * Create or update a linear gradient in SVG defs
 * @param defs SVG defs element
 * @param id Gradient ID
 * @param colors Array of colors for gradient stops
 */
function createLinearGradient(
    defs: d3.Selection<SVGDefsElement, unknown, null, undefined>,
    id: string,
    colors: string[]
): void {
    // Remove existing gradient with same ID
    defs.select(`#${id}`).remove();

    // Create diagonal gradient (135 degrees for better visibility)
    const gradient = defs
        .append('linearGradient')
        .attr('id', id)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '100%');

    // Add color stops
    colors.forEach((color, i) => {
        const offset = (i / Math.max(1, colors.length - 1)) * 100;
        gradient
            .append('stop')
            .attr('offset', `${offset}%`)
            .attr('stop-color', color)
            .attr('stop-opacity', 1);
    });
}

/**
 * Get SVG defs element from a selection, creating if needed
 * @param svg SVG root element
 * @returns Defs selection
 */
export function ensureDefs(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
): d3.Selection<SVGDefsElement, unknown, null, undefined> {
    let defs = svg.select<SVGDefsElement>('defs');

    if (defs.empty()) {
        defs = svg.insert('defs', ':first-child');
    }

    return defs;
}