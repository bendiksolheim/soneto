"use client";

import { useState } from "react";
import type { Point } from "@/lib/map/point";
import {
  type GenerateRouteInput,
  type GenerateRouteResult,
  generateRouteDirections,
  generateRouteIsochrone,
  generateRouteOptimization,
  type RouteDebugData,
} from "@/lib/routes";
import { Button } from "../base";

type Algorithm = "directions" | "isochrone" | "optimization";

function runAlgorithm(
  algorithm: Algorithm,
  input: GenerateRouteInput,
  token: string,
): Promise<GenerateRouteResult> {
  switch (algorithm) {
    case "directions":
      return generateRouteDirections(input, token);
    case "isochrone":
      return generateRouteIsochrone(input, token);
    case "optimization":
      return generateRouteOptimization(input, token);
  }
}

type CardinalDirection = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

const CARDINAL_BEARINGS: Record<CardinalDirection, number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
};

const CARDINAL_OPTIONS: CardinalDirection[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

type Shape = "subtle" | "balanced" | "strong";

const SHAPE_ELONGATION: Record<Shape, number> = {
  subtle: 1.5,
  balanced: 2.5,
  strong: 4.0,
};

const SHAPE_OPTIONS: Shape[] = ["subtle", "balanced", "strong"];

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; actualDistanceMeters: number }
  | { kind: "error"; message: string };

type AutoRouteProps = {
  mapboxToken: string;
  userLocation: Point | null;
  onRouteGenerated: (result: GenerateRouteResult) => void;
  onDebugDataChanged: (data: RouteDebugData | null) => void;
};

export function AutoRoute(props: AutoRouteProps): React.ReactElement {
  const [distanceKm, setDistanceKm] = useState<string>("5");
  const [direction, setDirection] = useState<CardinalDirection>("N");
  const [shape, setShape] = useState<Shape>("balanced");
  const [topology, setTopology] = useState<"triangle" | "kite" | "rounded">("triangle");
  const [lateralOffset, setLateralOffset] = useState<string>("0.5");
  const [bulgeAmount, setBulgeAmount] = useState<string>("0.5");
  const [algorithm, setAlgorithm] = useState<Algorithm>("directions");
  const [distanceTolerance, setDistanceTolerance] = useState<string>("0.15");
  const [densifyIntervalMeters, setDensifyIntervalMeters] = useState<string>("500");
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [lastDebugData, setLastDebugData] = useState<RouteDebugData | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const locationUnavailable = props.userLocation === null;
  const generating = status.kind === "loading";
  const disabled = locationUnavailable || generating;

  const handleGenerate = async () => {
    if (!props.userLocation) return;

    const parsed = Number(distanceKm);
    if (!Number.isFinite(parsed) || parsed < 0.5 || parsed > 50) {
      setStatus({
        kind: "error",
        message: "Distance must be between 0.5 and 50 km.",
      });
      return;
    }

    const input: GenerateRouteInput = {
      start: props.userLocation,
      targetLengthMeters: parsed * 1000,
      bearing: CARDINAL_BEARINGS[direction],
      elongation: SHAPE_ELONGATION[shape],
      lateralOffset: topology !== "triangle" ? Number(lateralOffset) : 0,
      bulgeAmount: topology === "rounded" ? Number(bulgeAmount) : 0,
      distanceTolerance: Number(distanceTolerance),
      densifyIntervalMeters: Number(densifyIntervalMeters),
    };

    setStatus({ kind: "loading" });

    try {
      const result: GenerateRouteResult = await runAlgorithm(algorithm, input, props.mapboxToken);

      setLastDebugData(result.debug);
      props.onRouteGenerated(result);
      props.onDebugDataChanged(showDebug ? result.debug : null);
      setStatus({ kind: "success", actualDistanceMeters: result.actualDistanceMeters });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Couldn't generate a route — try a different direction or distance.";
      setStatus({ kind: "error", message });
    }
  };

  return (
    <div className="flex flex-col gap-3 min-w-64">
      <label className="form-control">
        <span className="label-text text-xs mb-1">Distance (km)</span>
        <input
          type="number"
          className="input input-sm input-bordered w-full"
          min={0.5}
          max={50}
          step={0.5}
          value={distanceKm}
          onChange={(e) => setDistanceKm(e.target.value)}
        />
      </label>

      <label className="form-control">
        <span className="label-text text-xs mb-1">Direction</span>
        <select
          className="select select-sm select-bordered w-full"
          value={direction}
          onChange={(e) => setDirection(e.target.value as CardinalDirection)}
        >
          {CARDINAL_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>

      <label className="form-control">
        <span className="label-text text-xs mb-1">Shape</span>
        <select
          className="select select-sm select-bordered w-full"
          value={shape}
          onChange={(e) => setShape(e.target.value as Shape)}
        >
          {SHAPE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label className="form-control">
        <span className="label-text text-xs mb-1">Topology</span>
        <select
          className="select select-sm select-bordered w-full"
          value={topology}
          onChange={(e) => setTopology(e.target.value as "triangle" | "kite" | "rounded")}
        >
          <option value="triangle">triangle</option>
          <option value="kite">kite</option>
          <option value="rounded">rounded</option>
        </select>
      </label>

      {topology !== "triangle" && (
        <label className="form-control">
          <span className="label-text text-xs mb-1">Lateral offset (0–1)</span>
          <input
            type="number"
            className="input input-sm input-bordered w-full"
            min={0}
            max={1}
            step={0.1}
            value={lateralOffset}
            onChange={(e) => setLateralOffset(e.target.value)}
          />
        </label>
      )}

      {topology === "rounded" && (
        <label className="form-control">
          <span className="label-text text-xs mb-1">Bulge amount (0–1)</span>
          <input
            type="number"
            className="input input-sm input-bordered w-full"
            min={0}
            max={1}
            step={0.1}
            value={bulgeAmount}
            onChange={(e) => setBulgeAmount(e.target.value)}
          />
        </label>
      )}

      <label className="form-control">
        <span className="label-text text-xs mb-1">Distance tolerance (0–1)</span>
        <input
          type="number"
          className="input input-sm input-bordered w-full"
          min={0}
          max={1}
          step={0.05}
          value={distanceTolerance}
          onChange={(e) => setDistanceTolerance(e.target.value)}
        />
      </label>

      <label className="form-control">
        <span className="label-text text-xs mb-1">Densify interval (m)</span>
        <input
          type="number"
          className="input input-sm input-bordered w-full"
          min={10}
          step={10}
          value={densifyIntervalMeters}
          onChange={(e) => setDensifyIntervalMeters(e.target.value)}
        />
      </label>

      <fieldset className="flex flex-col gap-1">
        <span className="label-text text-xs">Algorithm</span>
        <label className="label cursor-pointer justify-start gap-2 py-1">
          <input
            type="radio"
            name="auto-route-algorithm"
            className="radio radio-sm"
            checked={algorithm === "directions"}
            onChange={() => setAlgorithm("directions")}
          />
          <span className="label-text">directions</span>
        </label>
        <label className="label cursor-pointer justify-start gap-2 py-1">
          <input
            type="radio"
            name="auto-route-algorithm"
            className="radio radio-sm"
            checked={algorithm === "isochrone"}
            onChange={() => setAlgorithm("isochrone")}
          />
          <span className="label-text">isochrone</span>
        </label>
        <label className="label cursor-pointer justify-start gap-2 py-1">
          <input
            type="radio"
            name="auto-route-algorithm"
            className="radio radio-sm"
            checked={algorithm === "optimization"}
            onChange={() => setAlgorithm("optimization")}
          />
          <span className="label-text">optimization</span>
        </label>
      </fieldset>

      <label className="label cursor-pointer justify-start gap-2 py-1">
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={showDebug}
          onChange={(e) => {
            setShowDebug(e.target.checked);
            props.onDebugDataChanged(e.target.checked ? lastDebugData : null);
          }}
        />
        <span className="label-text text-xs">Show debug overlay</span>
      </label>

      <Button variant="primary" size="sm" disabled={disabled} onClick={handleGenerate}>
        {generating ? <span className="loading loading-spinner loading-xs" /> : "Generate"}
      </Button>

      {locationUnavailable && <p className="text-xs text-base-content/60">Location unavailable.</p>}

      {status.kind === "success" && (
        <p className="text-xs text-base-content/70">
          Generated {(status.actualDistanceMeters / 1000).toFixed(2)} km
        </p>
      )}

      {status.kind === "error" && <p className="text-xs text-error">{status.message}</p>}
    </div>
  );
}
