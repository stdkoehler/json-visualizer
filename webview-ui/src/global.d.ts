interface Window {
  acquireVsCodeApi?: () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    postMessage: (msg: any) => void;
    // You can add more VS Code API methods here if needed
  };
}
