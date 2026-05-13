import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface EmptyDataPromptProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export default function EmptyDataPrompt({
  icon,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: EmptyDataPromptProps) {
  return (
    <div className="card-elevated p-6 text-center space-y-3">
      {icon && (
        <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      )}
      <div>
        <h3 className="font-semibold text-base">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="flex gap-2 justify-center pt-1">
        <Button onClick={onPrimary} className="bg-primary text-primary-foreground">
          {primaryLabel}
        </Button>
        {secondaryLabel && onSecondary && (
          <Button variant="outline" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
