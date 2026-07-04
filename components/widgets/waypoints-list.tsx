import { XCircleIcon } from "@/icons";
import type { Point } from "@/lib/map/point";
import { cn } from "@/lib/utils";
import { Button } from "../base";

type WaypointsListProps = {
  points: Array<Point>;
  pointDistances: Array<number>;
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
  onDelete: (index: number) => void;
};

export function WaypointsList(props: WaypointsListProps): React.ReactElement {
  const { points, pointDistances, hoveredIndex, onHover, onDelete } = props;

  if (points.length === 0) {
    return <p className="text-sm text-gray-500">Klikk på kartet for å legge til veipunkter.</p>;
  }

  return (
    <ul className="max-h-[40vh] overflow-y-auto overscroll-contain divide-y divide-base-300 -mx-2">
      {points.map((point, index) => {
        const isStart = index === 0;
        const isFinish = index === points.length - 1;
        const label = isStart ? "Start" : isFinish ? "Mål" : `Veipunkt ${index}`;
        const glyph = isStart ? "▶" : isFinish ? "⚑" : "•";
        const distance = pointDistances[index];

        return (
          <li
            key={`${point.latitude}-${point.longitude}`}
            onMouseEnter={() => onHover(index)}
            onMouseLeave={() => onHover(null)}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 text-sm",
              hoveredIndex === index && "bg-base-200",
            )}
          >
            <span className="w-4 text-center text-base-content text-xs">{glyph}</span>
            <span className="flex-1">{label}</span>
            <span className="text-xs text-gray-500 tabular-nums">
              {distance !== undefined ? `${distance.toFixed(1)} km` : "—"}
            </span>
            <Button variant="ghost" size="sm" onClick={() => onDelete(index)}>
              <XCircleIcon size={14} />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
