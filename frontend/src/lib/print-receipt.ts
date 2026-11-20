export function printThermalReceipt(
  thermalText: string,
  paperSize: "58mm" | "80mm" = "80mm",
  title = "Receipt"
): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc || !iframe.contentWindow) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  const width = paperSize === "58mm" ? "58mm" : "80mm";
  const fontSize = paperSize === "58mm" ? "10px" : "11px";

  doc.open();
  doc.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title></title>
    <style>
      @page {
        size: ${width} auto;
        margin: 0;
      }
      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #000000;
        overflow: visible;
      }
      pre {
        margin: 0 auto;
        padding: 4mm;
        width: ${width};
        box-sizing: border-box;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        font-size: ${fontSize};
        line-height: 1.35;
        white-space: pre-wrap;
        word-break: break-word;
        overflow: visible;
      }
    </style>
  </head>
  <body><pre id="receipt-content"></pre></body>
</html>`);
  doc.close();

  doc.title = title;
  const pre = doc.getElementById("receipt-content");
  if (pre) {
    pre.textContent = thermalText;
  }

  const cleanup = () => {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  };

  iframe.contentWindow.onafterprint = cleanup;
  iframe.contentWindow.focus();
  iframe.contentWindow.print();

  // Fallback cleanup if onafterprint does not fire in a browser
  window.setTimeout(cleanup, 60_000);
}
