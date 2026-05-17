"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Placement = "start" | "center" | "end" | "top" | "bottom" | "left" | "right";

type DropdownProps = React.PropsWithChildren<{
  title: React.ReactElement | string;
  placement?: Placement;
  classNames?: {
    dropdown?: string;
    button?: string;
    menu?: string;
    content?: string;
  };
}>;

export function Dropdown(props: DropdownProps): React.ReactElement {
  const placement = placements[props.placement ?? "center"];
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [isOpen]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "dropdown z-50",
        placement,
        isOpen && "dropdown-open",
        props.classNames?.dropdown,
      )}
    >
      <button
        type="button"
        className={cn("btn btn-sm whitespace-nowrap", props.classNames?.button)}
        onClick={() => setIsOpen((v) => !v)}
      >
        {props.title}
      </button>
      {isOpen && (
        <div className={cn("dropdown-content", props.classNames?.content)}>{props.children}</div>
      )}
    </div>
  );
}

const placements = {
  start: "dropdown-start",
  center: "dropdown-center",
  end: "dropdown-end",
  top: "dropdown-top",
  bottom: "dropdown-bottom",
  left: "dropdown-left",
  right: "dropdown-right",
};
