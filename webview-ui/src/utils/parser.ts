// src/utils/parser.ts
import type { HierarchyNode, HierarchyArrayItem } from "./types";

function hasClass(obj: any): obj is { __class__: string } {
  return typeof obj === "object" && obj !== null && "__class__" in obj;
}

/**
 * Recursively builds a hierarchical data structure from JSON for d3.tree.
 */
export function buildHierarchy(json: any): HierarchyNode {
  const visited = new Set(); // To handle circular references

  function traverse(data: any, name: string): HierarchyNode {
    if (typeof data !== "object" || data === null) {
      throw new Error("Root must be an object or array");
    }

    if (visited.has(data)) {
      return {
        name,
        type: Array.isArray(data) ? "array" : "object",
        fields: [{ name: "[Circular]", value: "[Circular Reference]" }],
      };
    }
    visited.add(data);

    const isArray = Array.isArray(data);

    if (isArray) {
      const items: HierarchyArrayItem[] = [];
      for (let i = 0; i < data.length; i++) {
        const value = data[i];
        if (typeof value === "object" && value !== null) {
          items.push(traverse(value, String(i)));
        } else {
          items.push({ name: String(i), value, type: "primitive" });
        }
      }
      visited.delete(data);
      return {
        name,
        type: "array",
        items,
      };
    } else {
      const children: HierarchyNode[] = [];
      const fields: { name: string; value: any }[] = [];
      let classname: string | undefined;
      for (const key of Object.keys(data)) {
        const value = data[key];
        if (typeof value === "object" && value !== null) {
          children.push(traverse(value, key));
        } else {
          if (key === "__class__") {
            classname = value;
          } else {
            fields.push({ name: key, value });
          }
        }
      }
      visited.delete(data);
      const node: HierarchyNode = {
        name,
        type: "object",
        ...(classname != null && { classname }),
      };
      if (children.length > 0) node.children = children;
      if (fields.length > 0) node.fields = fields;
      return node;
    }
  }

  return traverse(json, "(root)");
}
