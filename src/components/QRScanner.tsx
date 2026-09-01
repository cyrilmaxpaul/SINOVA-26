import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, RefreshCw, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EmployeeQRPayload } from "@/lib/types";

interface Props {
  onScan: (payload: EmployeeQRPayload, raw: string) => void;
  paused?: boolean; // stop scanning while showing a result
}

const REGION_ID = "qr-reader";
type Facing = "environment" | "user";

function parsePayload(raw: string): EmployeeQRPayload | null {
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj.empId === "string") {
      return { empId: obj.empId, name: obj.name ?? "", team: obj.team ?? "" };
    }
  } catch {
    // Not JSON — maybe a bare employee id or a token (e.g. attendance QR).
    if (/^[A-Za-z0-9_-]{3,}$/.test(raw.trim())) {
      return { empId: raw.trim(), name: "", team: "" };
    }
  }
  return null;
}

export function QRScanner({ onScan, paused = false }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [facing, setFacing] = useState<Facing>("environment"); // back camera by default
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>("");
  const startingRef = useRef(false);

  async function start(mode: Facing = facing) {
    if (startingRef.current) return;
    startingRef.current = true;
    setError("");
    try {
      if (!scannerRef.current) scannerRef.current = new Html5Qrcode(REGION_ID);
      // Request by facingMode (not deviceId) so we get the real front/back camera and
      // avoid iOS's virtual "back dual wide / triple" cameras that often won't decode.
      await scannerRef.current.start(
        { facingMode: mode },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          const payload = parsePayload(decoded);
          if (payload) onScan(payload, decoded);
          else setError("Unrecognized QR code.");
        },
        () => {
          /* per-frame decode failures are normal; ignore */
        }
      );
      setRunning(true);
    } catch (e) {
      setError("Unable to start camera. Allow camera access and try again.");
      console.error(e);
    } finally {
      startingRef.current = false;
    }
  }

  async function stop() {
    const s = scannerRef.current;
    if (s && s.isScanning) {
      try {
        await s.stop();
      } catch {
        /* ignore */
      }
    }
    setRunning(false);
  }

  async function flip() {
    const next: Facing = facing === "environment" ? "user" : "environment";
    setFacing(next);
    if (running) {
      await stop();
      setTimeout(() => start(next), 200);
    }
  }

  // Pause/resume the video without tearing down the instance.
  useEffect(() => {
    const s = scannerRef.current;
    if (!s) return;
    if (paused && s.isScanning) s.pause(true);
    else if (!paused && s.isScanning) {
      try {
        s.resume();
      } catch {
        /* ignore */
      }
    }
  }, [paused]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      const s = scannerRef.current;
      if (s && s.isScanning) s.stop().catch(() => {});
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border bg-black">
        <div id={REGION_ID} className="mx-auto w-full [&_video]:!w-full [&_video]:!object-cover" />
        {!running && (
          <div className="flex aspect-square max-h-[60vh] items-center justify-center text-white/60">
            <div className="text-center">
              <Camera className="mx-auto mb-2 h-10 w-10" />
              <p className="text-sm">Camera is off</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="flex items-center gap-2">
        {running ? (
          <>
            <Button variant="destructive" onClick={stop} className="flex-1">
              <CameraOff className="h-4 w-4" /> Stop
            </Button>
            <Button variant="outline" onClick={flip} title="Switch camera">
              <SwitchCamera className="h-4 w-4" />
              <span className="hidden sm:inline">{facing === "environment" ? "Front" : "Back"}</span>
            </Button>
          </>
        ) : (
          <Button onClick={() => start()} className="flex-1">
            <RefreshCw className="h-4 w-4" /> Start Scanning
          </Button>
        )}
      </div>
    </div>
  );
}
