// src/components/D3Visualization.tsx
import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { HierarchyNode } from "../utils/types";

interface D3VisualizationProps {
  data: HierarchyNode;
}

const D3Visualization: React.FC<D3VisualizationProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;

    svg.selectAll("*").remove(); // Clear previous render

    const PADDING = 12;
    const LINE_HEIGHT = 18;
    const CHAR_WIDTH = 7.5;
    const NODE_MIN_WIDTH = 180;
    const NODE_MAX_WIDTH = 400;
    const DOT_RADIUS = 4;
    const TITLE_SPACING = LINE_HEIGHT * 0.3; // Extra spacing after title

    // For d3.hierarchy, treat array items that are objects/arrays as children, primitives as leaves
    function getChildrenForD3(
      node: HierarchyNode
    ): HierarchyNode[] | undefined {
      if (node.type === "object") return node.children;
      if (node.type === "array" && node.items) {
        // Only return items that are objects/arrays (not primitives)
        return node.items.filter(
          (item): item is HierarchyNode =>
            (item as any).type === "object" || (item as any).type === "array"
        );
      }
      return undefined;
    }

    const root: d3.HierarchyNode<HierarchyNode> = d3.hierarchy(
      data,
      getChildrenForD3
    );

    // Assign a width and height to each node for layout calculation
    root.each((node) => {
      let maxTextWidth = node.data.name.length * CHAR_WIDTH;
      let lineCount = 1; // title
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
          if (
            (item as any).type === "object" ||
            (item as any).type === "array"
          ) {
            // Enhanced format: "0: object" or "1: array"
            const text = `${(item as HierarchyNode).name}: ${
              (item as any).type
            }`;
            maxTextWidth = Math.max(maxTextWidth, text.length * CHAR_WIDTH);
          } else {
            // primitive
            const text = `${item.name}: ${JSON.stringify((item as any).value)}`;
            maxTextWidth = Math.max(maxTextWidth, text.length * CHAR_WIDTH);
          }
          lineCount++;
        });
      }
      (node as any).width = Math.min(
        Math.max(NODE_MIN_WIDTH, maxTextWidth + PADDING * 2),
        NODE_MAX_WIDTH
      );
      (node as any).height =
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

    // --- Nodes ---
    const nodeGroup = g.append("g").attr("class", "nodes");

    const node = nodeGroup
      .selectAll<SVGGElement, d3.HierarchyNode<HierarchyNode>>("g")
      .data(root.descendants())
      .join("g")
      .attr("transform", (d) => `translate(${(d as any).y},${(d as any).x})`)
      .attr("class", "node-group");

    // Node background
    node
      .append("rect")
      .attr("class", (d) =>
        d.data.type === "object" ? "object-box" : "array-box"
      )
      .attr("width", (d) => (d as any).width)
      .attr("height", (d) => (d as any).height)
      .attr("x", 0)
      .attr("y", (d) => -(d as any).height / 2)
      .attr("rx", 6);

    // Node Title (key name)
    node
      .append("text")
      .attr("class", "node-text node-title")
      .attr("x", PADDING)
      .attr("y", (d) => -(d as any).height / 2 + PADDING + 5)
      .text((d) => d.data.name);

    // Node content with cell structure
    node.each(function (d) {
      const parent = d3.select(this);

      // Step 2: Add proper spacing after title
      let yOffset =
        -(d as any).height / 2 + PADDING + LINE_HEIGHT + TITLE_SPACING;

      const cellData: {
        y: number;
        height: number;
        hasConnection: boolean;
        textY: number;
      }[] = [];
      const dotsData: { index: number; y: number }[] = [];

      // Step 3: Build cell structure with consistent coordinates
      if (d.data.type === "object") {
        if (d.data.fields) {
          d.data.fields.forEach(() => {
            const cellY = yOffset - LINE_HEIGHT / 2;
            const textY = yOffset; // Text at center of cell
            cellData.push({
              y: cellY,
              height: LINE_HEIGHT,
              hasConnection: false,
              textY,
            });
            yOffset += LINE_HEIGHT;
          });
        }
        if (d.data.children) {
          d.data.children.forEach(() => {
            const cellY = yOffset - LINE_HEIGHT / 2;
            const textY = yOffset; // Text at center of cell
            cellData.push({
              y: cellY,
              height: LINE_HEIGHT,
              hasConnection: true,
              textY,
            });

            // Dots at same Y as text (center of cell)
            dotsData.push({
              index: cellData.length - 1,
              y: textY,
            });
            yOffset += LINE_HEIGHT;
          });
        }
      } else if (d.data.type === "array" && d.data.items) {
        d.data.items.forEach((item) => {
          const cellY = yOffset - LINE_HEIGHT / 2;
          const textY = yOffset; // Text at center of cell
          const hasConnection = (item as any).type !== "primitive";
          cellData.push({
            y: cellY,
            height: LINE_HEIGHT,
            hasConnection,
            textY,
          });

          if (hasConnection) {
            // Dots at same Y as text (center of cell)
            dotsData.push({
              index: cellData.length - 1,
              y: textY,
            });
          }
          yOffset += LINE_HEIGHT;
        });
      }

      // Step 3: Add cell dividers with symmetric padding
      const cellsGroup = parent.append("g").attr("class", "cell-backgrounds");
      const dotAreaWidth = DOT_RADIUS * 3;
      const leftPadding = 4;

      cellData.forEach((cell, index) => {
        // Top divider for each cell
        cellsGroup
          .append("line")
          .attr("class", "cell-divider-top")
          .attr("x1", leftPadding)
          .attr("x2", (d as any).width - dotAreaWidth)
          .attr("y1", cell.y)
          .attr("y2", cell.y);

        // Bottom divider for last cell
        if (index === cellData.length - 1) {
          cellsGroup
            .append("line")
            .attr("class", "cell-divider-bottom")
            .attr("x1", leftPadding)
            .attr("x2", (d as any).width - dotAreaWidth)
            .attr("y1", cell.y + cell.height)
            .attr("y2", cell.y + cell.height);
        }

        // Step 6: Hover areas
        const cellHoverArea = cellsGroup
          .append("rect")
          .attr("class", "cell-hover-area")
          .attr("x", 1)
          .attr("y", cell.y)
          .attr("width", (d as any).width - 2)
          .attr("height", cell.height)
          .attr("fill", "transparent")
          .attr("stroke", "none")
          .style("cursor", cell.hasConnection ? "pointer" : "default");

        const cellBackground = cellsGroup
          .append("rect")
          .attr("class", "cell-background")
          .attr("x", 1)
          .attr("y", cell.y)
          .attr("width", (d as any).width - 2)
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

      // Step 4: Render text at cell centers
      if (d.data.type === "object") {
        if (d.data.fields) {
          d.data.fields.forEach((field, index) => {
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
        if (d.data.children) {
          const fieldCount = d.data.fields ? d.data.fields.length : 0;
          d.data.children.forEach((child, index) => {
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
      } else if (d.data.type === "array" && d.data.items) {
        d.data.items.forEach((item, index) => {
          const cell = cellData[index];
          if ((item as any).type === "primitive") {
            const primitiveItem = item as {
              name: string;
              value: any;
              type: "primitive";
            };
            const text = parent
              .append("text")
              .attr("class", "node-text node-field")
              .attr("x", PADDING + 10)
              .attr("y", cell.textY)
              .attr("dominant-baseline", "middle");

            text
              .append("tspan")
              .text(`${primitiveItem.name}: `)
              .attr("class", "field-key");
            text
              .append("tspan")
              .text(`${JSON.stringify(primitiveItem.value)}`)
              .attr("class", "field-value");
          } else {
            const nodeItem = item as HierarchyNode;
            const text = parent
              .append("text")
              .attr("class", "node-text node-child-link")
              .attr("x", PADDING + 10)
              .attr("y", cell.textY)
              .attr("dominant-baseline", "middle");

            text.append("tspan").text(`${nodeItem.name}: `);

            text
              .append("tspan")
              .text(`${nodeItem.type}`)
              .attr("font-style", "italic");
          }
        });
      }

      // Step 4 & 5: Render dots at same Y as text
      const dotsGroup = parent.append("g").attr("class", "child-link-dots");
      dotsData.forEach((dot) => {
        dotsGroup
          .append("circle")
          .attr("class", "child-link-dot")
          .attr("data-cell-index", dot.index)
          .attr("cx", (d as any).width) // Right edge of the node
          .attr("cy", dot.y) // Same Y as text
          .attr("r", DOT_RADIUS);
      });
    });

    // Step 5: Fix connector positioning - render links after nodes are positioned
    const linkGroup = g
      .append("g")
      .attr("class", "d3-link-group");

    linkGroup
      .selectAll<SVGPathElement, d3.HierarchyLink<HierarchyNode>>("path")
      .data(root.links())
      .join("path")
      .attr("class", "link")
      .attr("marker-end", "url(#arrowhead)")
      .attr("d", (d) => {
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

        // Find the correct dot position
        let adjustedSourceY = sourceNode.x; // Default fallback
        const parentData = sourceNode.data;

        if (parentData.type === "object" && parentData.children) {
          const childIndex = parentData.children.findIndex(
            (child) => child.name === targetNode.data.name
          );
          if (childIndex !== -1) {
            const fieldsCount = parentData.fields
              ? parentData.fields.length
              : 0;
            const totalIndex = fieldsCount + childIndex;
            // Calculate dot Y position using same logic as node rendering
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
            if (
              (item as any).type === "object" ||
              (item as any).type === "array"
            ) {
              return (item as HierarchyNode).name === targetNode.data.name;
            }
            return false;
          });

          if (childIndex !== -1) {
            // Calculate dot Y position using same logic as node rendering
            adjustedSourceY =
              sourceNode.x -
              sourceNode.height / 2 +
              PADDING +
              LINE_HEIGHT +
              TITLE_SPACING +
              childIndex * LINE_HEIGHT;
          }
        }

        const sourceX = sourceNode.y + sourceNode.width; // Start from right edge

        // Simple straight line from dot to target
        return `M${sourceX},${adjustedSourceY}L${targetX},${targetY}`;
      });

    // Zoom and Pan
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    // Fit to screen initially
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
  }, [data]);

  return (
    <div ref={containerRef} className="visualization-container">
      <svg ref={svgRef} className="visualization-svg"></svg>
    </div>
  );
};

export default D3Visualization;
