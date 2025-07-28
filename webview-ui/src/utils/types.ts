// src/utils/types.ts



export interface PrimitiveArrayItem {
  name: string;
  value: unknown;
  type: 'primitive';
}

export type HierarchyArrayItem =
  | HierarchyNode // for objects/arrays
  | PrimitiveArrayItem;

export interface HierarchyNode {
  name: string;
  type: 'object' | 'array';
  // For objects:
  children?: HierarchyNode[];
  fields?: { name: string; value: unknown }[];
  // For arrays:
  items?: HierarchyArrayItem[];
  // Visualization state:
  isInTree?: boolean;
}

// Type guard for HierarchyNode
export function isHierarchyNode(item: unknown): item is HierarchyNode {
  return (
    typeof item === 'object' &&
    item !== null &&
    'type' in item &&
    (item as { type?: unknown }).type === 'object' || (item as { type?: unknown }).type === 'array'
  );
}

// Type guard for PrimitiveArrayItem
export function isPrimitiveArrayItem(item: unknown): item is PrimitiveArrayItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    'type' in item &&
    (item as { type?: unknown }).type === 'primitive'
  );
}
