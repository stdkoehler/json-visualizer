import * as vscode from 'vscode';
import * as path from 'path';

let panel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('d3Visualizer.visualizeVariable', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.selection;
      const selectedText = editor.document.getText(selection);

      const mockJson = {
        name: selectedText,
        values: [1, 2, 3, 4, 5]
      };

      if (!panel) {
        panel = vscode.window.createWebviewPanel(
          'd3Visualizer',
          'D3 Variable Visualizer',
          vscode.ViewColumn.Beside,
          {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
          }
        );

        panel.onDidDispose(() => {
          panel = undefined;
        });

        const scriptUri = panel.webview.asWebviewUri(
          vscode.Uri.joinPath(context.extensionUri, 'media', 'assets/index.js')
        );

        const styleUri = panel.webview.asWebviewUri(
          vscode.Uri.joinPath(context.extensionUri, 'media', 'assets/index.css')
        );

        const nonce = getNonce();

        panel.webview.html = /* html */ `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${panel.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
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
      }

      panel.webview.postMessage({ type: 'updateData', payload: mockJson });
    })
  );
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
