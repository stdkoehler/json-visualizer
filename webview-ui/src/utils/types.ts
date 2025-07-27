// src/utils/types.ts


export type HierarchyArrayItem =
  | HierarchyNode // for objects/arrays
  | { name: string; value: any; type: 'primitive' };

export interface HierarchyNode {
  name: string;
  type: 'object' | 'array';
  // For objects:
  children?: HierarchyNode[];
  fields?: { name: string; value: any }[];
  // For arrays:
  items?: HierarchyArrayItem[];
}
