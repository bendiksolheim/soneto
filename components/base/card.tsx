import { cn } from "@/lib/utils";

type CardProps = React.PropsWithChildren<{
  className?: string;
  title?: string;
  actions?: React.ReactNode;
}>;

export function Card(props: CardProps) {
  return (
    <div className={cn("card card-xs bg-base-100 shadow-xl", props.className)}>
      <div className="card-body">
        {props.title && <h2 className="card-title">{props.title}</h2>}
        {props.actions && (
          <div className="card-actions justify-end absolute top-1 right-1">{props.actions}</div>
        )}
        {props.children}
      </div>
    </div>
  );
}
