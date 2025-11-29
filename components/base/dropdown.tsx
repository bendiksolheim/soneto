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
  const placement = placements[props.placement ?? "start"];
  return (
    <div className={cn("dropdown", placement, props.classNames?.dropdown)}>
      <div
        tabIndex={0}
        role="button"
        className={cn("btn btn-sm whitespace-nowrap", props.classNames?.button)}
      >
        {props.title}
      </div>
      <div tabIndex={0} className={cn("dropdown-content", props.classNames?.content)}>
        {props.children}
      </div>
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
