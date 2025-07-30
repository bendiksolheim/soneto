"use client";

import React, { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Save, Download, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RouteActionsProps {
  onSaveRoute: () => void;
  onExportGPX: () => void;
  onResetRoute: () => void;
  isVisible: boolean;
}

export function RouteActions(props: RouteActionsProps): JSX.Element | null {
  const { onSaveRoute, onExportGPX, onResetRoute, isVisible } = props;

  return (
    <div
      className={cn("absolute top-[50%] translate-y-[-50%] transition-[right]", {
        "-right-32": !isVisible,
        "right-4": isVisible,
      })}
    >
      <div className="flex flex-col items-start space-y-1 p-2">
        <ActionButton title="Lagre løype" onClick={onSaveRoute}>
          <Save />
        </ActionButton>
        <ActionButton title="Eksporter GPX" onClick={onExportGPX}>
          <Download />
        </ActionButton>
        <ActionButton title="Start på nytt" onClick={onResetRoute}>
          <Trash2 />
        </ActionButton>
      </div>
    </div>
  );
}

type ActionButtonProps = React.PropsWithChildren<{
  title: string;
  onClick: () => void;
}>;

function ActionButton({ title, onClick, children }: ActionButtonProps): ReactNode {
  return (
    <Button
      size="icon"
      onClick={onClick}
      className="bg-white rounded-full shadow-lg size-8"
      variant="ghost"
      title={title}
    >
      {children}
    </Button>
  );
}
