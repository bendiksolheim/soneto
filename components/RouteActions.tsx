"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Save, Download, Trash2 } from "lucide-react";

interface RouteActionsProps {
  onSaveRoute: () => void;
  onExportGPX: () => void;
  onResetRoute: () => void;
  isVisible: boolean;
}

export function RouteActions(props: RouteActionsProps): JSX.Element | null {
  const { onSaveRoute, onExportGPX, onResetRoute, isVisible } = props;

  if (!isVisible) {
    return null;
  }

  return (
    <div className="absolute bottom-4 right-8 bg-white rounded-2xl shadow-lg z-10 overflow-hidden">
      <div className="flex flex-col items-start space-y-1 p-2">
        <Button
          size="xs"
          onClick={onSaveRoute}
          className="hover:bg-green-50 hover:text-green-700"
          variant="ghost"
        >
          <Save className="w-4 h-4 mr-1" />
          Lagre løype
        </Button>
        <Button
          size="xs"
          onClick={onExportGPX}
          className="hover:bg-blue-50 hover:text-blue-700"
          variant="ghost"
        >
          <Download className="w-4 h-4 mr-1" />
          Eksporter GPX
        </Button>
        <Button
          size="xs"
          onClick={onResetRoute}
          className="hover:bg-red-50 hover:text-red-700"
          variant="ghost"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Start på nytt
        </Button>
      </div>
    </div>
  );
}
