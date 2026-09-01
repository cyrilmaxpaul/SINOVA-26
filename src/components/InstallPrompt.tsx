import { useEffect, useState } from "react";
import { Download, Plus, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  const ua = navigator.userAgent;
  // iPadOS 13+ Safari reports as "MacIntel" with touch — catch that too.
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Install affordance. Dismissal is in-memory only, so the banner returns on the
 * next load/refresh (it never permanently disappears). Android/desktop Chrome use
 * the native prompt; iOS Safari (no programmatic install) gets step-by-step
 * Add-to-Home-Screen instructions.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);

  const standalone = typeof window !== "undefined" && isStandalone();
  const ios = typeof navigator !== "undefined" && isIOS();

  useEffect(() => {
    const win = window as unknown as { __bipEvent?: BeforeInstallPromptEvent };
    const adopt = () => win.__bipEvent && setDeferred(win.__bipEvent);
    adopt(); // may have fired before mount (captured in main.tsx)

    const onReady = () => adopt();
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setDismissed(true);
    };
    window.addEventListener("bip-ready", onReady);
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("bip-ready", onReady);
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const canPrompt = !!deferred;
  const show = !standalone && !dismissed && (canPrompt || ios);

  async function handleInstall() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      setDismissed(true);
    } else if (ios) {
      setIosOpen(true);
    }
  }

  if (!show) return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-[60] mx-auto max-w-md p-3 pb-20 sm:pb-3">
        <div className="flex items-center gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
          <Download className="h-5 w-5 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 text-sm font-medium">Install SINOVA'26 for a full-screen app.</p>
          <Button size="sm" onClick={handleInstall}>
            {canPrompt ? "Install" : "How to"}
          </Button>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Dialog open={iosOpen} onOpenChange={setIosOpen}>
        <DialogContent onClose={() => setIosOpen(false)}>
          <DialogHeader>
            <DialogTitle>Install on iPhone / iPad</DialogTitle>
            <DialogDescription>
              Safari can add SINOVA'26 to your home screen so it opens like a real app:
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                1
              </span>
              Tap the <Share className="h-4 w-4 text-primary" /> <span className="font-semibold">Share</span> button
              in Safari's toolbar.
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                2
              </span>
              Scroll down and tap <span className="font-semibold">Add to Home Screen</span>
              <Plus className="h-4 w-4 text-primary" />.
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                3
              </span>
              Tap <span className="font-semibold">Add</span> — SINOVA'26 appears on your home screen.
            </li>
          </ol>
          <p className="mt-1 text-xs text-muted-foreground">
            Note: this only works in <span className="font-medium">Safari</span> (not Chrome) on iOS.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
