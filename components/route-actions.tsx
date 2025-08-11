"use client";

import React, { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Save, Download, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface RouteActionsProps {
  onSaveRoute: (name: string) => void;
  onExportGPX: () => void;
  onResetRoute: () => void;
  isVisible: boolean;
}

export function RouteActions(props: RouteActionsProps): JSX.Element | null {
  const { onSaveRoute, onExportGPX, onResetRoute, isVisible } = props;
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [routeName, setRouteName] = React.useState("");

  return (
    <div
      className={cn("absolute top-[50%] translate-y-[-50%] transition-[right]", {
        "-right-32": !isVisible,
        "right-4": isVisible,
      })}
    >
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-full shadow-lg flex flex-col items-start space-y-1 p-2">
        <TooltipProvider>
          <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
            <DialogTrigger asChild>
              <ActionButton title="Lagre løype">
                <Save />
              </ActionButton>
            </DialogTrigger>
            <DialogContent>
              <form
                onSubmit={(e) => {
                  onSaveRoute(routeName);
                  e.preventDefault();
                  setSaveOpen(false);
                }}
              >
                <DialogHeader>
                  <DialogTitle>Lagre løypen</DialogTitle>
                  <DialogDescription>
                    Løypen lagres lokalt i denne nettleseren, og er ikke tilgjengelig fra noen andre
                    enheter.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-3">
                    <Label htmlFor="route-name">Navn på løype</Label>
                    <Input
                      value={routeName}
                      onChange={(e) => setRouteName(e.target.value)}
                      id="route-name"
                      placeholder="Navn på løype"
                    ></Input>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button>Avbryt</Button>
                  </DialogClose>
                  <Button type="submit" disabled={routeName.length === 0}>
                    Lagre
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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
        <TooltipArrow />
        <p>{title}</p>
      </TooltipContent>
    </Tooltip>
  );
}
