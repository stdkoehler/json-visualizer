import * as vscode from "vscode";
import * as path from "path";

export function activate(context: vscode.ExtensionContext) {
  // Register the WebviewViewProvider for the custom view
  const provider = new JsonVisualizerViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("jsonVisualizerView", provider)
  );

  // Register the command to reveal the view and send data
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "d3Visualizer.visualizeVariable",
      async () => {
        // Reveal the view
        await vscode.commands.executeCommand(
          "workbench.view.extension.jsonVisualizerPanel"
        );
        // Send mock data to the view
        provider.postMockJson();
      }
    )
  );
}

class JsonVisualizerViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
  }

  resolveWebviewView(view: vscode.WebviewView) {
    this._view = view;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._context.extensionUri, "media"),
      ],
    };

    const scriptUri = view.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._context.extensionUri,
        "media",
        "assets/index.js"
      )
    );
    const styleUri = view.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._context.extensionUri,
        "media",
        "assets/index.css"
      )
    );
    const nonce = getNonce();

    view.webview.html = /* html */ `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${view.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleUri}" rel="stylesheet" />
        <title>D3 Visualizer</title>
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
      </body>
      </html>
    `;

    view.webview.onDidReceiveMessage((message) => {
      if (message.type === "ready") {
        this.postMockJson();
      }
    });
  }

  postMockJson() {
    if (!this._view) {
      return;
    }
    const yourJsonObject = {
      name: "Test Object",
      value: 123,
      nested: {
        foo: "bar",
        arr: [1, 2, 3],
        obj: { a: 1, b: 2 },
      },
      list: [
        { id: 1, label: "one" },
        { id: 2, label: "two" },
      ],
      flag: true,
    };
    this._view.webview.postMessage({
      type: "set-json",
      payload: yourJsonObject,
    });
  }
}
function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
