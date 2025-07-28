// src/App.tsx
import { useState, useMemo, useEffect } from "react";
import { buildHierarchy } from "./utils/parser";
import JsonEditor from "./components/JsonEditor";
import D3Visualization from "./components/D3Visualization";
import "./styles/App.css";
import type { HierarchyNode } from "./utils/types";

const initialJson = {
  orderId: "A-789 ",
  customer: {
    name: "Jane Doe ",
    contact: {
      email: "jane.d@email.com ",
      phone: "555-1234 ",
    },
  },
  items: [
    {
      product: "Widget ",
      quantity: 2,
    },
    {
      product: "Gadget ",
      quantity: 1,
    },
    "Note: Expedite ",
  ],
  numbers: [0, 1, 2, 3],
  stuff: [{ a: "b " }, { c: "d " }, { e: "f " }],
};

function getEmptyHierarchy(): HierarchyNode {
  return {
    name: "root",
    type: "object",
    children: [],
  };
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

  return (
    <div className="app-container">
      <header>
        <h1>JSON Visualizer 🧬 (React + D3)</h1>
        <p>
          Edit the JSON in the text area to see the visualization update in
          real-time.
        </p>
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
          <D3Visualization data={graphData} />
        </div>
      </main>
    </div>
  );
}

export default App;
