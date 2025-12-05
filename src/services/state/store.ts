import { FamilyData } from '../../types/types';
import type { Family } from '../../utils/familyDetection';

export interface AppState {
    familyData: FamilyData | null;
    fullFamilyData: FamilyData | null;
    visibleNodes: Set<string>;
    highlightedNodes: Set<string>;
    selectedNodeId: string | null;
    transform: { k: number; x: number; y: number } | null;
    isPatrilineal: boolean;
    isSidebarOpen: boolean;
    isDarkMode: boolean;

    // Family filtering state
    families: Family[];
    memberToFamilies: Map<string, string[]>; // member_id -> family_ids
    familyColors: Map<string, string>;       // family_id -> color
    activeFamilyIds: Set<string>;            // Currently visible families
}

type Listener = (state: AppState) => void;

export class FamilyTreeStore {
    private state: AppState;
    private listeners: Set<Listener>;
    private debounceTimer: any;

    constructor() {
        this.listeners = new Set();
        this.state = {
            familyData: null,
            fullFamilyData: null,
            visibleNodes: new Set(),
            highlightedNodes: new Set(),
            selectedNodeId: null,
            transform: null,
            isPatrilineal: false,
            isSidebarOpen: false,
            isDarkMode: false,

            // Family filtering state
            families: [],
            memberToFamilies: new Map(),
            familyColors: new Map(),
            activeFamilyIds: new Set(),
        };

        // Load initial preferences
        this.state.isPatrilineal = localStorage.getItem('soyagaci_patrilineal_mode') === 'true';

        // Load family filter preferences
        const savedFamilyFilters = localStorage.getItem('soyagaci_active_families');
        if (savedFamilyFilters) {
            try {
                const familyIds = JSON.parse(savedFamilyFilters);
                this.state.activeFamilyIds = new Set(familyIds);
            } catch (e) {
                console.warn('Failed to parse saved family filters', e);
            }
        }
    }

    getState(): AppState {
        return this.state;
    }

    subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach(listener => listener(this.state));
        this.persistState();
    }

    private persistState() {
        // Debounce URL updates
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            if (this.state.familyData) {
                // We need a way to pass the "tree" object or just the data needed for URL
                // For now, let's just update localStorage for preferences
                localStorage.setItem('soyagaci_patrilineal_mode', String(this.state.isPatrilineal));
                if (this.state.selectedNodeId) {
                    localStorage.setItem('soyagaci_last_node', this.state.selectedNodeId);
                }

                // Persist family filters
                const familyIds = Array.from(this.state.activeFamilyIds);
                localStorage.setItem('soyagaci_active_families', JSON.stringify(familyIds));
            }
        }, 500);
    }

    // Actions
    setData(data: FamilyData) {
        this.state.familyData = data;
        this.state.fullFamilyData = JSON.parse(JSON.stringify(data)); // Deep copy for reset
        this.notify();
    }

    setPatrilineal(isPatrilineal: boolean) {
        this.state.isPatrilineal = isPatrilineal;
        this.notify();
    }

    setSelectedNode(nodeId: string | null) {
        this.state.selectedNodeId = nodeId;
        this.notify();
    }

    setSidebarOpen(isOpen: boolean) {
        this.state.isSidebarOpen = isOpen;
        this.notify();
    }

    setVisibleNodes(nodes: Set<string>) {
        this.state.visibleNodes = nodes;
        this.notify();
    }

    setTransform(transform: { k: number; x: number; y: number }) {
        this.state.transform = transform;
        // Don't notify for transform to avoid performance issues, or throttle it
    }

    // Family filtering actions
    setFamilies(
        families: Family[],
        memberToFamilies: Map<string, string[]>,
        familyColors: Map<string, string>
    ) {
        this.state.families = families;
        this.state.memberToFamilies = memberToFamilies;
        this.state.familyColors = familyColors;

        // If we have saved filters, validate they still exist
        if (this.state.activeFamilyIds.size > 0) {
            const validFamilyIds = new Set(families.map(f => f.id));
            const filteredActive = new Set(
                Array.from(this.state.activeFamilyIds).filter(id => validFamilyIds.has(id))
            );

            // If no saved filters are valid, activate all families
            if (filteredActive.size === 0) {
                this.state.activeFamilyIds = validFamilyIds;
            } else {
                this.state.activeFamilyIds = filteredActive;
            }
        } else {
            // No saved filters, activate all families by default
            this.state.activeFamilyIds = new Set(families.map(f => f.id));
        }

        this.notify();
    }

    setActiveFamilies(familyIds: Set<string>) {
        this.state.activeFamilyIds = familyIds;
        this.notify();
    }

    toggleFamily(familyId: string) {
        const newActive = new Set(this.state.activeFamilyIds);
        if (newActive.has(familyId)) {
            newActive.delete(familyId);
        } else {
            newActive.add(familyId);
        }
        this.setActiveFamilies(newActive);
    }

    activateAllFamilies() {
        const allFamilyIds = new Set(this.state.families.map(f => f.id));
        this.setActiveFamilies(allFamilyIds);
    }

    deactivateAllFamilies() {
        this.setActiveFamilies(new Set());
    }

    isFamilyActive(familyId: string): boolean {
        return this.state.activeFamilyIds.has(familyId);
    }

    isNodeInActiveFamily(nodeId: string): boolean {
        const nodeFamilies = this.state.memberToFamilies.get(nodeId);
        if (!nodeFamilies || nodeFamilies.length === 0) return true; // Show nodes without families

        return nodeFamilies.some(familyId => this.state.activeFamilyIds.has(familyId));
    }
}

export const store = new FamilyTreeStore();
