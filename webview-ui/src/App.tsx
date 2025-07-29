// src/App.tsx
import { useState, useMemo, useEffect } from "react";
import { buildHierarchy } from "./utils/parser";
import JsonEditor from "./components/JsonEditor";
import D3Visualization from "./components/D3Visualization";
import "./styles/App.css";
import type { HierarchyNode } from "./utils/types";
import { isHierarchyNode } from "./utils/types";

const initialJson = {
  orderId: "A-789",
  customer: {
    name: "Jane Doe",
    contact: {
      email: "jane.d@email.com",
      phone: "555-1234",
    },
  },
  items: [
    {
      product: "Widget",
      quantity: 2,
    },
    {
      product: "Gadget",
      quantity: 1,
    },
    "Note: Expedite",
  ],
  numbers: [0, 1, 2, 3],
  stuff: [{ a: "b " }, { c: "d " }, { e: "f " }, { f: { "h": "i" } }, "A", [1, 2, 3, 4]],
  myclass: {
    __class__: "Fruit",
    name: "ananas"
  }
};

function getEmptyHierarchy(): HierarchyNode {
  return {
    name: "root",
    type: "object",
    children: [],
  };
}

function getAllExpandablePaths(node: HierarchyNode, parentPath: string = "root"): string[] {
  const paths: string[] = [];
  const path = parentPath + (node.name ? "/" + node.name : "");
  if (node.type === "object" && node.children) {
    node.children.forEach((child) => {
      const childPath = path + "/" + child.name;
      paths.push(childPath);
      paths.push(...getAllExpandablePaths(child, path));
    });
  } else if (node.type === "array" && node.items) {
    node.items.forEach((item) => {
      if (isHierarchyNode(item)) {
        const childPath = path + "/" + item.name;
        paths.push(childPath);
        paths.push(...getAllExpandablePaths(item, path));
      }
    });
  }
  return paths;
}

function App() {
  const [jsonString, setJsonString] = useState(
    JSON.stringify(initialJson, null, 2)
  );

  // Notify extension that the webview is ready, and listen for set-json messages
  useEffect(() => {
    // Use VS Code webview API for communication
    const vscode = window.acquireVsCodeApi ? window.acquireVsCodeApi() : undefined;
    vscode?.postMessage({ type: 'ready' });

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'set-json') {
        setJsonString(JSON.stringify(event.data.payload, null, 2));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const { graphData, error } = useMemo(() => {
    try {
      const parsedJson = JSON.parse(jsonString);
      return { graphData: buildHierarchy(parsedJson), error: null };
    } catch (e) {
      const err = e as Error;
      return {
        graphData: getEmptyHierarchy(),
        error: err.message,
      };
    }
  }, [jsonString]);

  // Expansion state for the tree (moved up from D3Visualization)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["root"]));

  // Expand all: collect all expandable paths and set them
  const handleExpandAll = () => {
    const allPaths = getAllExpandablePaths(graphData);
    setExpanded(new Set(["root", ...allPaths]));
  };

  // Collapse all: only root is expanded
  const handleCollapseAll = () => {
    setExpanded(new Set(["root"]));
  };

  return (
    <div className="app-container">
      <header>
        <h1>JSON Visualizer 🧬 (React + D3)</h1>
        <p>
          Edit the JSON in the text area to see the visualization update in
          real-time.
        </p>
        <div style={{ marginTop: 8 }}>
          <button onClick={handleExpandAll} style={{ marginRight: 8 }}>Expand All</button>
          <button onClick={handleCollapseAll}>Collapse All</button>
        </div>
      </header>
      <main>
        <div className="editor-pane">
          <div className="editor-wrapper">
            <JsonEditor
              value={jsonString}
              onChange={setJsonString}
              error={error}
            />
          </div>
        </div>
        <div className="visualization-pane">
          <D3Visualization data={graphData} expanded={expanded} setExpanded={setExpanded} />
        </div>
      </main>
    </div>
  );
}

export default App;
