import { useIsMobile } from "@/hooks/use-mobile";
import appMetadata from "@/lib/app-metadata";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProvideFeedback?: () => void;
}

const AboutContent = ({ onProvideFeedback }: { onProvideFeedback?: () => void }) => (
  <div className="space-y-5 text-sm overflow-y-auto max-h-[60vh] pr-1">
    {/* What this app does */}
    <section>
      <h3 className="font-medium text-foreground mb-1">What this app does</h3>
      <p className="text-muted-foreground leading-relaxed">{appMetadata.descriptionShort}</p>
    </section>

    {/* Key features */}
    <section>
      <h3 className="font-medium text-foreground mb-1">Key features</h3>
      <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
        {appMetadata.features.map((f) => (
          <li key={f.title}>{f.title}</li>
        ))}
      </ul>
    </section>

    {/* Privacy */}
    <section>
      <h3 className="font-medium text-foreground mb-1">Privacy &amp; Data</h3>
      <p className="text-muted-foreground leading-relaxed">{appMetadata.privacySummary}</p>
    </section>

    {/* Support */}
    {(appMetadata.feedbackEnabled || appMetadata.supportEmail) && (
      <section>
        <h3 className="font-medium text-foreground mb-1">Support</h3>
        <div className="space-y-2">
          {appMetadata.feedbackEnabled && onProvideFeedback && (
            <Button variant="outline" size="sm" onClick={onProvideFeedback}>
              Provide Feedback
            </Button>
          )}
          {appMetadata.supportEmail && (
            <p className="text-muted-foreground">
              Email:{" "}
              <a href={`mailto:${appMetadata.supportEmail}`} className="text-primary underline">
                {appMetadata.supportEmail}
              </a>
            </p>
          )}
        </div>
      </section>
    )}
  </div>
);

const HeaderContent = () => (
  <div className="flex items-center gap-2 flex-wrap">
    <span>{appMetadata.appName}</span>
    <Badge variant="secondary" className="text-xs font-normal">
      {appMetadata.version}
    </Badge>
    {appMetadata.environmentLabel && (
      <Badge variant="outline" className="text-xs font-normal">
        {appMetadata.environmentLabel}
      </Badge>
    )}
  </div>
);

const AboutPanel = ({ open, onOpenChange, onProvideFeedback }: Props) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle><HeaderContent /></DrawerTitle>
            <DrawerDescription>About this application</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6">
            <AboutContent onProvideFeedback={onProvideFeedback} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle><HeaderContent /></DialogTitle>
          <DialogDescription>About this application</DialogDescription>
        </DialogHeader>
        <AboutContent onProvideFeedback={onProvideFeedback} />
      </DialogContent>
    </Dialog>
  );
};

export default AboutPanel;
