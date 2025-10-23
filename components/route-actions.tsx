"use client";

import React, { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Save, Download, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SaveRouteDialog } from "@/components/save-route-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface RouteActionsProps {
  onSaveRoute: (name: string) => void;
  onExportGPX: () => void;
  onResetRoute: () => void;
  isVisible: boolean;
}

export function RouteActions(props: RouteActionsProps): React.ReactElement {
  const { onSaveRoute, onExportGPX, onResetRoute, isVisible } = props;
  const [saveOpen, setSaveOpen] = React.useState(false);

  return (
    <div
      className={cn("absolute top-[50%] translate-y-[-50%] transition-[right]", {
        "-right-32": !isVisible,
        "right-4": isVisible,
      })}
    >
      <div className="bg-white/95 backdrop-blur-xs border border-gray-200 rounded-full shadow-lg flex flex-col items-start space-y-1 p-2">
        <TooltipProvider>
          <SaveRouteDialog
            open={saveOpen}
            onOpenChange={setSaveOpen}
            onSaveRoute={onSaveRoute}
            trigger={
              <ActionButton title="Lagre løype">
                <Save />
              </ActionButton>
            }
          />
          <ActionButton title="Eksporter GPX" onClick={onExportGPX}>
            <Download />
          </ActionButton>
          <ActionButton title="Slett alle punktene" onClick={onResetRoute}>
            <Trash2 />
          </ActionButton>
        </TooltipProvider>
      </div>
    </div>
  );
}

type ActionButtonProps = React.PropsWithChildren<{
  title: string;
  onClick?: () => void;
}>;

function ActionButton({ title, onClick, children }: ActionButtonProps): ReactNode {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon" onClick={onClick} className="rounded-full size-8" variant="ghost">
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">
        <p>{title}</p>
      </TooltipContent>
    </Tooltip>
  );
}
