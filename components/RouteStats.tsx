"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { StoredRoute } from "@/lib/types/route";

interface RouteStatsProps {
  distance: number;
  routePoints: [number, number][];
  onClearRoute: () => void;
  saveRoute: (routeData: { name: string; points: [number, number][] }) => Promise<StoredRoute>;
}

export const RouteStats: React.FC<RouteStatsProps> = ({
  distance,
  routePoints,
  onClearRoute,
  saveRoute,
}) => {
  const [pace, setPace] = useState([6]); // Default pace of 6:00 min/km
  const [routeName, setRouteName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const currentPaceMinPerKm = pace[0];
  const estimatedTime = distance > 0 ? distance * currentPaceMinPerKm : 0; // result in minutes
  const hasRoute = routePoints.length > 1;

  const handleSaveRoute = async () => {
    if (!hasRoute || !routeName.trim()) {
      toast.error("Please enter a route name");
      return;
    }

    try {
      setIsSaving(true);
      await saveRoute({
        name: routeName.trim(),
        points: routePoints,
      });

      toast.success(`Route "${routeName.trim()}" saved successfully!`);
      setRouteName("");
    } catch (error) {
      toast.error("Failed to save route");
      console.error("Save route error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-4xl px-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-full shadow-lg px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Stats Section */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">Distanse:</span>
              <span className="font-semibold text-sm text-blue-600">
                {distance > 0 ? distance.toFixed(2) : "0.00"} km
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">Tid:</span>
              <span className="font-medium text-sm text-gray-900">
                {distance > 0 ? Math.round(estimatedTime) : "0"} min
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">Tempo:</span>
              <span className="font-medium text-sm text-gray-900">
                {Math.floor(currentPaceMinPerKm)}:
                {((currentPaceMinPerKm % 1) * 60).toFixed(0).padStart(2, "0")}
              </span>
              <div className="w-20">
                <Slider
                  value={pace}
                  onValueChange={setPace}
                  min={2}
                  max={12}
                  step={0.25}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Actions Section */}
          <div className="flex items-center space-x-2">
            {hasRoute && (
              <>
                <Input
                  placeholder="Navn på løypen..."
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  className="w-32 h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSaveRoute();
                    }
                  }}
                />
                <Button
                  onClick={handleSaveRoute}
                  disabled={!routeName.trim() || isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-8"
                  size="sm"
                >
                  <Save className="w-3 h-3 mr-1" />
                  {isSaving ? "Lagrer..." : "Lagre"}
                </Button>
              </>
            )}
            <Button
              onClick={onClearRoute}
              variant="outline"
              className="bg-white/90 backdrop-blur-sm border-gray-300 text-gray-700 hover:bg-gray-50 h-8"
              size="sm"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
