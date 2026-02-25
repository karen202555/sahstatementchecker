import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share, CheckCircle2, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => setIsInstalled(true);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="mx-auto max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-2xl bg-primary/10 p-4">
            <Smartphone className="h-12 w-12 text-primary" />
          </div>
        </div>

        <h1 className="text-3xl font-bold tracking-tight">Install Statement Checker</h1>

        {isInstalled ? (
          <div className="space-y-3">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
            <p className="text-muted-foreground">
              Statement Checker is already installed! Open it from your home screen.
            </p>
          </div>
        ) : isIOS ? (
          <div className="space-y-4 text-left">
            <p className="text-muted-foreground text-center">
              To install on your iPhone or iPad:
            </p>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                <span>Tap the <Share className="inline h-4 w-4 -mt-0.5" /> <strong>Share</strong> button in Safari's toolbar</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                <span>Tap <strong>"Add"</strong> to confirm</span>
              </li>
            </ol>
          </div>
        ) : deferredPrompt ? (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Install Statement Checker on your device for quick access, offline support, and a native app experience.
            </p>
            <Button size="lg" onClick={handleInstall} className="gap-2">
              <Download className="h-5 w-5" />
              Install App
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground">
            Open this page in Chrome, Edge, or Safari to install Statement Checker on your device.
          </p>
        )}
      </div>
    </div>
  );
}
