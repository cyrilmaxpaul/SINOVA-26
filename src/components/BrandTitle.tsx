import { useEvent } from "@/context/EventContext";
import { cn } from "@/lib/utils";

/** SINOVA'26 wordmark with the admin-uploaded logo shown before it. */
export function BrandTitle({
  className,
  logoClassName,
  subtitle,
}: {
  className?: string;
  logoClassName?: string;
  subtitle?: string;
}) {
  const { settings } = useEvent();
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {settings.logoUrl && (
        <img
          src={settings.logoUrl}
          alt="Event logo"
          className={cn("h-9 w-9 rounded-lg object-cover", logoClassName)}
        />
      )}
      <div className="leading-tight">
        <div className="text-lg font-extrabold tracking-tight">
          {settings.eventName || "SINOVA'26"}
        </div>
        {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
      </div>
    </div>
  );
}
