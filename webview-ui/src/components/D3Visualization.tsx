// src/components/D3Visualization.tsx
import React, { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import type { HierarchyNode } from "../utils/types";
import { isHierarchyNode, isPrimitiveArrayItem } from "../utils/types";

// Extend D3's HierarchyNode to include width/height for layout
interface CustomHierarchyNode extends d3.HierarchyNode<HierarchyNode> {
  width: number;
  height: number;
}


interface D3VisualizationProps {
  data: HierarchyNode;
}

// Helper: get unique path for a node
function getNodePath(node: HierarchyNode, parentPath: string = "root"): string {
  if (!node || !node.name) return parentPath;
  return parentPath + "/" + node.name;
}


interface D3VisualizationWithExpandProps extends D3VisualizationProps {
  expanded: Set<string>;
  setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>;
}


// Types for cell and dot data
interface CellData {
  y: number;
  height: number;
  hasConnection: boolean;
  textY: number;
  childNode?: HierarchyNode;
  childPath?: string;
}
interface DotData {
  index: number;
  y: number;
  childNode: HierarchyNode;
  childPath: string;
}

// Helper to build cell and dot data for a node
function getCellAndDotData(
  node: CustomHierarchyNode,
  nodePath: string,
  PADDING: number,
  LINE_HEIGHT: number,
  TITLE_SPACING: number
): { cellData: CellData[]; dotsData: DotData[] } {
  let yOffset = -node.height / 2 + PADDING + LINE_HEIGHT + TITLE_SPACING;
  const cellData: CellData[] = [];
  const dotsData: DotData[] = [];
  if (node.data.type === "object") {
    if (node.data.fields) {
      node.data.fields.forEach(() => {
        const cellY = yOffset - LINE_HEIGHT / 2;
        const textY = yOffset;
        cellData.push({ y: cellY, height: LINE_HEIGHT, hasConnection: false, textY });
        yOffset += LINE_HEIGHT;
      });
    }
    if (node.data.children) {
      node.data.children.forEach((child) => {
        const cellY = yOffset - LINE_HEIGHT / 2;
        const textY = yOffset;
        const childPath = getNodePath(child, nodePath);
        cellData.push({ y: cellY, height: LINE_HEIGHT, hasConnection: true, textY, childNode: child, childPath });
        dotsData.push({ index: cellData.length - 1, y: textY, childNode: child, childPath });
        yOffset += LINE_HEIGHT;
      });
    }
  } else if (node.data.type === "array" && node.data.items) {
    node.data.items.forEach((item) => {
      const cellY = yOffset - LINE_HEIGHT / 2;
      const textY = yOffset;
      const hasConnection = isHierarchyNode(item);
      let childNode: HierarchyNode | undefined = undefined;
      let childPath: string | undefined = undefined;
      if (hasConnection) {
        childNode = item;
        childPath = getNodePath(childNode, nodePath);
      }
      cellData.push({ y: cellY, height: LINE_HEIGHT, hasConnection, textY, childNode, childPath });
      if (hasConnection && childNode && childPath) {
        dotsData.push({ index: cellData.length - 1, y: textY, childNode, childPath });
      }
      yOffset += LINE_HEIGHT;
    });
  }
  return { cellData, dotsData };
}

// Helper to render cell backgrounds and hover
function renderCellBackgrounds(
  parent: d3.Selection<SVGGElement, unknown, null, undefined>,
  cellData: CellData[],
  node: CustomHierarchyNode,
  dotsData: DotData[],
  DOT_RADIUS: number
) {
  const cellsGroup = parent.append("g").attr("class", "cell-backgrounds");
  const dotAreaWidth = DOT_RADIUS * 3;
  const leftPadding = 4;
  cellData.forEach((cell, index) => {
    cellsGroup
      .append("line")
      .attr("class", "cell-divider-top")
      .attr("x1", leftPadding)
      .attr("x2", node.width - dotAreaWidth)
      .attr("y1", cell.y)
      .attr("y2", cell.y);
    if (index === cellData.length - 1) {
      cellsGroup
        .append("line")
        .attr("class", "cell-divider-bottom")
        .attr("x1", leftPadding)
        .attr("x2", node.width - dotAreaWidth)
        .attr("y1", cell.y + cell.height)
        .attr("y2", cell.y + cell.height);
    }
    const cellHoverArea = cellsGroup
      .append("rect")
      .attr("class", "cell-hover-area")
      .attr("x", 1)
      .attr("y", cell.y)
      .attr("width", node.width - 2)
      .attr("height", cell.height)
      .attr("fill", "transparent")
      .attr("stroke", "none")
      .style("cursor", cell.hasConnection ? "pointer" : "default");
    const cellBackground = cellsGroup
      .append("rect")
      .attr("class", "cell-background")
      .attr("x", 1)
      .attr("y", cell.y)
      .attr("width", node.width - 2)
      .attr("height", cell.height)
      .attr("opacity", 0)
      .attr("rx", 3);
    const correspondingDot = dotsData.find((dot) => dot.index === index);
    cellHoverArea
      .on("mouseenter", function () {
        cellBackground.transition().duration(150).attr("opacity", 0.8);
        if (correspondingDot) {
          const dot = parent.select(
            `.child-link-dot[data-cell-index="${index}"]`
          );
          dot
            .transition()
            .duration(150)
            .attr("fill", "#4285F4")
            .attr("r", DOT_RADIUS + 1);
        }
      })
      .on("mouseleave", function () {
        cellBackground.transition().duration(150).attr("opacity", 0);
        if (correspondingDot) {
          const dot = parent.select(
            `.child-link-dot[data-cell-index="${index}"]`
          );
          dot
            .transition()
            .duration(150)
            .attr("fill", "#9AA0A6")
            .attr("r", DOT_RADIUS);
        }
      });
  });
}

// Helper to render cell text
function renderCellText(
  parent: d3.Selection<SVGGElement, unknown, null, undefined>,
  node: CustomHierarchyNode,
  cellData: CellData[],
  PADDING: number
) {
  if (node.data.type === "object") {
    if (node.data.fields) {
      node.data.fields.forEach((field, index) => {
        const cell = cellData[index];
        const text = parent
          .append("text")
          .attr("class", "node-text node-field")
          .attr("x", PADDING + 10)
          .attr("y", cell.textY)
          .attr("dominant-baseline", "middle");
        text
          .append("tspan")
          .text(`${field.name}: `)
          .attr("class", "field-key");
        text
          .append("tspan")
          .text(`${JSON.stringify(field.value)}`)
          .attr("class", "field-value");
      });
    }
    if (node.data.children) {
      const fieldCount = node.data.fields ? node.data.fields.length : 0;
      node.data.children.forEach((child, index) => {
        const cellIndex = fieldCount + index;
        const cell = cellData[cellIndex];
        parent
          .append("text")
          .attr("class", "node-text node-child-link")
          .attr("x", PADDING + 10)
          .attr("y", cell.textY)
          .attr("dominant-baseline", "middle")
          .text(`${child.name}`);
      });
    }
  } else if (node.data.type === "array" && node.data.items) {
    node.data.items.forEach((item, index) => {
      const cell = cellData[index];
      if (isPrimitiveArrayItem(item)) {
        const text = parent
          .append("text")
          .attr("class", "node-text node-field")
          .attr("x", PADDING + 10)
          .attr("y", cell.textY)
          .attr("dominant-baseline", "middle");
        text
          .append("tspan")
          .text(`${item.name}: `)
          .attr("class", "field-key");
        text
          .append("tspan")
          .text(`${JSON.stringify(item.value)}`)
          .attr("class", "field-value");
      } else if (isHierarchyNode(item)) {
        const text = parent
          .append("text")
          .attr("class", "node-text node-child-link")
          .attr("x", PADDING + 10)
          .attr("y", cell.textY)
          .attr("dominant-baseline", "middle");
        text.append("tspan").text(`${item.name}: `);
        text
          .append("tspan")
          .text(`${item.type}`)
          .attr("font-style", "italic");
      }
    });
  }
}

// Helper to render child dots
function renderChildDots(
  parent: d3.Selection<SVGGElement, unknown, null, undefined>,
  node: CustomHierarchyNode,
  dotsData: DotData[],
  expanded: Set<string>,
  DOT_RADIUS: number,
  nodePath: string,
  handleDotClick: (parentPath: string, childPath: string) => void
) {
  const dotsGroup = parent.append("g").attr("class", "child-link-dots");
  dotsData.forEach((dot) => {
    const isExpanded = expanded.has(dot.childPath);
    dotsGroup
      .append("circle")
      .attr("class", "child-link-dot" + (isExpanded ? " expanded" : " collapsed"))
      .attr("data-cell-index", dot.index)
      .attr("cx", node.width)
      .attr("cy", dot.y)
      .attr("r", DOT_RADIUS)
      .attr("fill", isExpanded ? "#4285F4" : "#9AA0A6")
      .style("cursor", "pointer")
      .on("click", (event) => {
        event.stopPropagation();
        handleDotClick(nodePath, dot.childPath);
      });
  });
}

// Helper to calculate link path
function getLinkPath(
  d: d3.HierarchyLink<HierarchyNode>,
  PADDING: number,
  LINE_HEIGHT: number,
  TITLE_SPACING: number
) {
  const sourceNode = d.source as d3.HierarchyNode<HierarchyNode> & {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  const targetNode = d.target as d3.HierarchyNode<HierarchyNode> & {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  const targetX = targetNode.y;
  const targetY = targetNode.x;
  let adjustedSourceY = sourceNode.x;
  const parentData = sourceNode.data;
  if (parentData.type === "object" && parentData.children) {
    const childIndex = parentData.children.findIndex(
      (child) => child.name === targetNode.data.name
    );
    if (childIndex !== -1) {
      const fieldsCount = parentData.fields ? parentData.fields.length : 0;
      const totalIndex = fieldsCount + childIndex;
      adjustedSourceY =
        sourceNode.x -
        sourceNode.height / 2 +
        PADDING +
        LINE_HEIGHT +
        TITLE_SPACING +
        totalIndex * LINE_HEIGHT;
    }
  } else if (parentData.type === "array" && parentData.items) {
    const childIndex = parentData.items.findIndex((item) => {
      if (isHierarchyNode(item)) {
        return item.name === targetNode.data.name;
      }
      return false;
    });
    if (childIndex !== -1) {
      adjustedSourceY =
        sourceNode.x -
        sourceNode.height / 2 +
        PADDING +
        LINE_HEIGHT +
        TITLE_SPACING +
        childIndex * LINE_HEIGHT;
    }
  }
  const sourceX = sourceNode.y + sourceNode.width;
  return `M${sourceX},${adjustedSourceY}L${targetX},${targetY}`;
}

const D3Visualization: React.FC<D3VisualizationWithExpandProps> = ({ data, expanded, setExpanded }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Recursively build a D3 hierarchy only for expanded nodes, and mark nodes that should be in the tree.
   *
   * The isInTree flag is a derived property, calculated here based on the current expansion state (expanded Set).
   * It is NOT set in handleDotClick, because:
   *   - handleDotClick only updates the expansion state (expanded Set), which is the source of truth for which nodes are expanded/collapsed.
   *   - isInTree is a temporary marker for the current render, not a persistent property of the data.
   *   - This separation keeps state management clean and predictable.
   *
   * Children must always be present in the data for rendering the parent's text, but whether a node is actually rendered as a box in the tree
   * is determined by the expansion state, not by a flag set in the click handler.
   */
  const buildD3Hierarchy = useCallback(
    (node: HierarchyNode, parentPath: string = "root"): HierarchyNode => {
      const path = getNodePath(node, parentPath);
      // Only mark as inTree if root or parent is expanded
      const isRoot = path === "root";
      const filtered: HierarchyNode & { isInTree?: boolean } = { ...node };
      filtered.isInTree = isRoot || expanded.has(path);
      if (node.type === "object" && node.children) {
        filtered.children = node.children.map((c: HierarchyNode) => {
          const childPath = getNodePath(c, path);
          // Only recurse if this child is expanded
          if (expanded.has(childPath)) {
            return buildD3Hierarchy(c, path);
          } else {
            // Not expanded: mark as not in tree, but keep enough info for dot rendering
            return { ...c, isInTree: false, children: undefined, items: undefined };
          }
        });
      } else if (node.type === "array" && node.items) {
        filtered.items = node.items.map((item) => {
          if (isHierarchyNode(item)) {
            const childPath = getNodePath(item, path);
            if (expanded.has(childPath)) {
              return buildD3Hierarchy(item, path);
            } else {
              return { ...item, isInTree: false, children: undefined, items: undefined };
            }
          }
          return item;
        });
      }
      return filtered;
    },
    [expanded]
  );

  // --- Click handler for dots ---
  const handleDotClick = useCallback(
    (_: string, childPath: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(childPath)) {
          // Collapse: remove childPath and all descendants
          const toRemove = [childPath];
          // Remove all descendants recursively
          for (let i = 0; i < toRemove.length; i++) {
            const p = toRemove[i];
            for (const ep of next) {
              if (ep.startsWith(p + "/")) toRemove.push(ep);
            }
          }
          toRemove.forEach((p) => next.delete(p));
        } else {
          // Expand
          next.add(childPath);
        }
        return next;
      });
    },
    [setExpanded]
  );

  // --- D3 rendering ---
  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    svg.selectAll("*").remove();

    const PADDING = 12;
    const LINE_HEIGHT = 18;
    const CHAR_WIDTH = 7.5;
    const NODE_MIN_WIDTH = 180;
    const NODE_MAX_WIDTH = 400;
    const DOT_RADIUS = 4;
    const TITLE_SPACING = LINE_HEIGHT * 0.3;

    // Use hierarchy with only expanded children
    const filteredData = buildD3Hierarchy(data);

    // Use isInTree flag to determine which nodes to include in the D3 hierarchy
    function getChildrenForD3(node: HierarchyNode): (HierarchyNode)[] | undefined {
      if (node.type === "object" && node.children) {
        return node.children.filter((c): c is HierarchyNode => isHierarchyNode(c) && Boolean(c.isInTree));
      }
      if (node.type === "array" && node.items) {
        return node.items.filter((item): item is HierarchyNode => isHierarchyNode(item) && Boolean((item as HierarchyNode).isInTree));
      }
      return undefined;
    }

    const root: CustomHierarchyNode = d3.hierarchy(
      filteredData,
      getChildrenForD3
    ) as CustomHierarchyNode;

    // Assign a width and height to each node for layout calculation
    root.each((node) => {
      let maxTextWidth = node.data.name.length * CHAR_WIDTH;
      let lineCount = 1;
      if (node.data.type === "object") {
        if (node.data.fields) {
          node.data.fields.forEach((f) => {
            const text = `${f.name}: ${JSON.stringify(f.value)}`;
            maxTextWidth = Math.max(maxTextWidth, text.length * CHAR_WIDTH);
            lineCount++;
          });
        }
        if (node.data.children) {
          node.data.children.forEach((c) => {
            const text = `${c.name}`;
            maxTextWidth = Math.max(maxTextWidth, text.length * CHAR_WIDTH);
            lineCount++;
          });
        }
      } else if (node.data.type === "array" && node.data.items) {
        node.data.items.forEach((item) => {
          if (isHierarchyNode(item)) {
            const text = `${item.name}: ${item.type}`;
            maxTextWidth = Math.max(maxTextWidth, text.length * CHAR_WIDTH);
          } else if (isPrimitiveArrayItem(item)) {
            const text = `${item.name}: ${JSON.stringify(item.value)}`;
            maxTextWidth = Math.max(maxTextWidth, text.length * CHAR_WIDTH);
          }
          lineCount++;
        });
      }
      (node as CustomHierarchyNode).width = Math.min(
        Math.max(NODE_MIN_WIDTH, maxTextWidth + PADDING * 2),
        NODE_MAX_WIDTH
      );
      (node as CustomHierarchyNode).height =
        lineCount * LINE_HEIGHT + PADDING * 2 + TITLE_SPACING;
    });

    const treeLayout: d3.TreeLayout<HierarchyNode> = d3
      .tree<HierarchyNode>()
      .nodeSize([220, 280])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.2));

    treeLayout(root);

    const g = svg.append("g");

    // Define marker for arrowheads
    svg
      .append("defs")
      .selectAll("marker")
      .data(["arrowhead"])
      .join("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("class", "arrowhead-path");

    // --- Links group first ---
    const linkGroup = g.append("g").attr("class", "d3-link-group");
    // --- Nodes group after ---
    const nodeGroup = g.append("g").attr("class", "nodes");

    const node = nodeGroup
      .selectAll<SVGGElement, CustomHierarchyNode>("g")
      .data(root.descendants() as CustomHierarchyNode[])
      .join("g")
      .attr("transform", (d) => `translate(${d.y},${d.x})`)
      .attr("class", "node-group");

    // Node background
    node
      .append("rect")
      .attr("class", (d) =>
        d.data.type === "object" ? "object-box" : "array-box"
      )
      .attr("width", (d) => d.width)
      .attr("height", (d) => d.height)
      .attr("x", 0)
      .attr("y", (d) => -d.height / 2)
      .attr("rx", 6);

    // Node Title (key name)
    node
      .append("text")
      .attr("class", "node-text node-title")
      .attr("x", PADDING)
      .attr("y", (d) => -d.height / 2 + PADDING + 5)
      .text((d) => d.data.name);

    // Node content with cell structure
    node.each(function (d) {
      const node = d as CustomHierarchyNode;
      const parent = d3.select(this);
      const nodePath = getNodePath(
        node.data,
        node.parent
          ? getNodePath(
              node.parent.data,
              node.parent.parent ? getNodePath(node.parent.parent.data) : "root"
            )
          : "root"
      );
      const { cellData, dotsData } = getCellAndDotData(
        node,
        nodePath,
        PADDING,
        LINE_HEIGHT,
        TITLE_SPACING
      );
      renderCellBackgrounds(parent, cellData, node, dotsData, DOT_RADIUS);
      renderCellText(parent, node, cellData, PADDING);
      renderChildDots(parent, node, dotsData, expanded, DOT_RADIUS, nodePath, handleDotClick);
    });

    // Step 6: Render links after nodes are positioned
    linkGroup
      .selectAll<SVGPathElement, d3.HierarchyLink<HierarchyNode>>("path")
      .data(root.links())
      .join("path")
      .attr("class", "link")
      .attr("marker-end", "url(#arrowhead)")
      .attr("d", (d) => getLinkPath(d, PADDING, LINE_HEIGHT, TITLE_SPACING));

    // Zoom and Pan
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    setTimeout(() => {
      const bounds = g.node()!.getBBox();
      const fullWidth = container.clientWidth;
      const fullHeight = container.clientHeight;
      const width = bounds.width;
      const height = bounds.height;
      const midX = bounds.x + width / 2;
      const midY = bounds.y + height / 2;
      if (width === 0 || height === 0) return;
      const scale = Math.min(fullWidth / width, fullHeight / height) * 0.9;
      const initialTransform = d3.zoomIdentity
        .translate(fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY)
        .scale(scale);
      svg.call(zoom).call(zoom.transform, initialTransform);
    }, 10);
  }, [data, expanded, buildD3Hierarchy, handleDotClick]);

  return (
    <div ref={containerRef} className="visualization-container">
      <svg ref={svgRef} className="visualization-svg"></svg>
    </div>
  );
};

export default D3Visualization;
