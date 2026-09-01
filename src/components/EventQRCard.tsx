import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Printable event QR that opens the app. Uses the current origin so it works
 *  both locally and on the deployed URL. */
export function EventQRCard() {
  // "/" = landing (choose Employee/Admin). Change to "/employee/register" to send
  // employees straight to the sign-up form.
  const [path] = useState<"/" | "/employee/register">("/");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}${path}`;

  function print() {
    const svg = document.getElementById("event-qr")?.outerHTML ?? "";
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) return;
    w.document.write(`
      <html><head><title>SINOVA'26 — Scan to Join</title>
      <style>
        body{font-family:system-ui,sans-serif;text-align:center;padding:48px}
        h1{font-size:32px;margin:0 0 4px}
        p{color:#555;margin:0 0 24px}
        .code{color:#888;font-size:13px;margin-top:24px;word-break:break-all}
        svg{width:360px;height:360px}
      </style></head>
      <body>
        <h1>SINOVA'26</h1>
        <p>Scan to join the event</p>
        ${svg}
        <div class="code">${url}</div>
        <script>window.onload=()=>{window.print()}</script>
      </body></html>`);
    w.document.close();
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" /> Event QR Code
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Print and display this. Attendees scan it to open the app on their phone.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center justify-center gap-3">
        <div className="rounded-xl bg-white p-4">
          <QRCodeSVG id="event-qr" value={url} size={200} level="M" />
        </div>
        <code className="break-all text-center text-xs text-muted-foreground">{url}</code>
        <Button variant="outline" onClick={print} className="w-full">
          <Printer className="h-4 w-4" /> Print QR poster
        </Button>
      </CardContent>
    </Card>
  );
}
