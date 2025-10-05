"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SaveRouteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveRoute: (name: string) => void;
  trigger?: React.ReactNode;
}

export function SaveRouteDialog(props: SaveRouteDialogProps) {
  const { open, onOpenChange, onSaveRoute, trigger } = props;
  const [routeName, setRouteName] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveRoute(routeName);
    onOpenChange(false);
    setRouteName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Lagre løype</DialogTitle>
            <DialogDescription>
              Løypen lagres lokalt i denne nettleseren og er ikke tilgjengelig fra andre enheter.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="route-name">Navn på løype</Label>
              <Input
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                id="route-name"
                placeholder="Skriv inn navn på løype"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Avbryt</Button>
            </DialogClose>
            <Button type="submit" disabled={routeName.length === 0}>
              Lagre
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
