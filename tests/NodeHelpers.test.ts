import { describe, it, expect } from 'vitest';
import { get_node_size, get_css_class } from '../src/components/Tree/NodeHelpers';
import { D3Node } from '../src/types/types';

describe('NodeHelpers', () => {
    describe('get_node_size', () => {
        it('should return consistent node size', () => {
            const size = get_node_size();
            expect(size).toBe(28);
            expect(typeof size).toBe('number');
        });
    });

    describe('get_css_class', () => {
        it('should return "family" for union nodes', () => {
            const unionNode: D3Node = {
                data: 'u_0_1',
                x: 0,
                y: 0,
                added_data: {} // Union nodes don't have input
            } as any;

            const cssClass = get_css_class(unionNode);
            expect(cssClass).toBe('family');
        });

        it('should return "member highlighted" for highlighted living members', () => {
            const node: D3Node = {
                data: 'mem_0',
                x: 0,
                y: 0,
                added_data: {
                    is_highlighted: true,
                    input: {
                        name: 'John Doe',
                        death_date: '' // Living
                    }
                }
            } as any;

            const cssClass = get_css_class(node);
            expect(cssClass).toBe('member highlighted');
        });

        it('should return "member non-highlighted" for non-highlighted living members', () => {
            const node: D3Node = {
                data: 'mem_0',
                x: 0,
                y: 0,
                added_data: {
                    is_highlighted: false,
                    input: {
                        name: 'John Doe',
                        death_date: ''
                    }
                }
            } as any;

            const cssClass = get_css_class(node);
            expect(cssClass).toBe('member non-highlighted');
        });

        it('should add "deceased" class for deceased members', () => {
            const node: D3Node = {
                data: 'mem_0',
                x: 0,
                y: 0,
                added_data: {
                    is_highlighted: true,
                    input: {
                        name: 'John Doe',
                        death_date: '2020'
                    }
                },
                children: () => [] // No children
            } as any;

            const cssClass = get_css_class(node);
            expect(cssClass).toContain('deceased');
            expect(cssClass).toBe('member highlighted deceased deceased-uncollapsed');
        });

        it('should add "deceased-uncollapsed" for deceased with no children', () => {
            const node: D3Node = {
                data: 'mem_0',
                x: 0,
                y: 0,
                added_data: {
                    is_highlighted: true,
                    input: {
                        name: 'John Doe',
                        death_date: '2020'
                    }
                },
                children: () => [] // No children
            } as any;

            const cssClass = get_css_class(node);
            expect(cssClass).toContain('deceased-uncollapsed');
        });

        it('should add "deceased-uncollapsed" for deceased with visible children (uncollapsed)', () => {
            const childNode: D3Node = {
                data: 'mem_1',
                x: 0,
                y: 0,
                added_data: {
                    is_visible: true,
                    input: { name: 'Child' }
                }
            } as any;

            const node: D3Node = {
                data: 'mem_0',
                x: 0,
                y: 0,
                added_data: {
                    is_highlighted: true,
                    input: {
                        name: 'John Doe',
                        death_date: '2020'
                    }
                },
                children: () => [childNode]
            } as any;

            const cssClass = get_css_class(node);
            expect(cssClass).toContain('deceased-uncollapsed');
        });

        it('should NOT add "deceased-uncollapsed" for deceased with hidden children (collapsed)', () => {
            const childNode: D3Node = {
                data: 'mem_1',
                x: 0,
                y: 0,
                added_data: {
                    is_visible: false, // Hidden child
                    input: { name: 'Child' }
                }
            } as any;

            const node: D3Node = {
                data: 'mem_0',
                x: 0,
                y: 0,
                added_data: {
                    is_highlighted: true,
                    input: {
                        name: 'John Doe',
                        death_date: '2020'
                    }
                },
                children: () => [childNode]
            } as any;

            const cssClass = get_css_class(node);
            expect(cssClass).toContain('deceased');
            expect(cssClass).not.toContain('deceased-uncollapsed');
        });

        it('should handle deceased non-highlighted member', () => {
            const node: D3Node = {
                data: 'mem_0',
                x: 0,
                y: 0,
                added_data: {
                    is_highlighted: false,
                    input: {
                        name: 'John Doe',
                        death_date: '2020'
                    }
                },
                children: () => []
            } as any;

            const cssClass = get_css_class(node);
            expect(cssClass).toBe('member non-highlighted deceased deceased-uncollapsed');
        });

        it('should handle edge case with undefined death_date', () => {
            const node: D3Node = {
                data: 'mem_0',
                x: 0,
                y: 0,
                added_data: {
                    is_highlighted: true,
                    input: {
                        name: 'John Doe'
                        // death_date undefined
                    }
                }
            } as any;

            const cssClass = get_css_class(node);
            expect(cssClass).toBe('member highlighted');
            expect(cssClass).not.toContain('deceased');
        });

        it('should handle mixed state - deceased with some visible and some hidden children', () => {
            const visibleChild: D3Node = {
                data: 'mem_1',
                x: 0,
                y: 0,
                added_data: {
                    is_visible: true,
                    input: { name: 'Visible Child' }
                }
            } as any;

            const hiddenChild: D3Node = {
                data: 'mem_2',
                x: 0,
                y: 0,
                added_data: {
                    is_visible: false,
                    input: { name: 'Hidden Child' }
                }
            } as any;

            const node: D3Node = {
                data: 'mem_0',
                x: 0,
                y: 0,
                added_data: {
                    is_highlighted: true,
                    input: {
                        name: 'John Doe',
                        death_date: '2020'
                    }
                },
                children: () => [visibleChild, hiddenChild]
            } as any;

            const cssClass = get_css_class(node);
            // Should be uncollapsed since at least one child is visible
            expect(cssClass).toContain('deceased-uncollapsed');
        });
    });
});
