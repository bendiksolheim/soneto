"use client";

import { XCircleIcon } from "@/icons";
import { Button } from "../base";

type RunModeOverlayProps = {
  distanceKm: number;
  elapsedSeconds: number;
  paceSecondsPerKm: number | null;
  onExit: () => void;
};

// The only chrome shown in run mode: a glanceable distance/time/pace readout and an
// exit button. The container is pointer-events-none so the (interaction-disabled)
// map underneath is never blocked; only the controls themselves are interactive.
export function RunModeOverlay({
  distanceKm,
  elapsedSeconds,
  paceSecondsPerKm,
  onExit,
}: RunModeOverlayProps): React.ReactElement {
  return (
    <div className="fixed inset-0 z-[1000] pointer-events-none">
      <div className="absolute top-[max(1rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="flex items-stretch gap-px rounded-2xl bg-black/75 text-white shadow-lg overflow-hidden backdrop-blur-sm">
          <Stat label="Distance" value={`${distanceKm.toFixed(2)} km`} />
          <Stat label="Time" value={formatDuration(elapsedSeconds)} />
          <Stat label="Pace" value={formatPace(paceSecondsPerKm)} />
        </div>
      </div>

      <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 pointer-events-auto">
        <Button
          size="lg"
          variant="error"
          className="shadow-lg gap-2 px-6 text-base"
          onClick={onExit}
        >
          <XCircleIcon size={22} />
          Exit run mode
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="flex flex-col items-center px-4 py-2 min-w-20">
      <span className="text-[0.65rem] uppercase tracking-wide opacity-70">{label}</span>
      <span className="text-xl font-semibold tabular-nums leading-tight">{value}</span>
    </div>
  );
}

// m:ss, or h:mm:ss once past an hour.
function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

// Pace as mm:ss per km, or a placeholder until enough distance is covered.
function formatPace(secondsPerKm: number | null): string {
  if (secondsPerKm === null || !Number.isFinite(secondsPerKm)) {
    return "--:--";
  }
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  // Guard the 60s rounding edge so we never render e.g. 5:60.
  const normalizedMinutes = seconds === 60 ? minutes + 1 : minutes;
  const normalizedSeconds = seconds === 60 ? 0 : seconds;
  return `${normalizedMinutes}:${normalizedSeconds.toString().padStart(2, "0")}`;
}
