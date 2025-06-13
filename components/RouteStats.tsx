"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { RotateCcw, Save } from "lucide-react";
import { useRoutes } from "@/hooks/use-routes";
import { toast } from "sonner";

interface RouteStatsProps {
  distance: number;
  routePoints: [number, number][];
  onClearRoute: () => void;
}

export const RouteStats: React.FC<RouteStatsProps> = ({ distance, routePoints, onClearRoute }) => {
  const [pace, setPace] = useState([6]); // Default pace of 6:00 min/km
  const [routeName, setRouteName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { saveRoute } = useRoutes();

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
    <div className="absolute top-1/2 left-4 transform -translate-y-1/2 z-20">
      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg min-w-48">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Distanse</span>
            <span className="font-bold text-lg text-blue-600">
              {distance > 0 ? distance.toFixed(2) : "0.00"} km
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Estimert tid</span>
            <span className="font-medium text-gray-900">
              {distance > 0 ? Math.round(estimatedTime) : "0"} min
            </span>
          </div>

          <div className="pt-2 border-t">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Tempo:</span>
              <span className="font-medium text-gray-900">
                {Math.floor(currentPaceMinPerKm)}:
                {((currentPaceMinPerKm % 1) * 60).toFixed(0).padStart(2, "0")} min/km
              </span>
            </div>
            <Slider
              value={pace}
              onValueChange={setPace}
              min={2}
              max={12}
              step={0.25}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>2:00</span>
              <span>12:00</span>
            </div>
          </div>

          {hasRoute && (
            <div className="pt-2 border-t">
              <Input
                placeholder="Navn på løypen..."
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                className="mb-2 text-sm"
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
                className="w-full mb-2 bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Saving..." : "Lagre løype"}
              </Button>
            </div>
          )}

          <Button
            onClick={onClearRoute}
            variant="outline"
            className="w-full bg-white/90 backdrop-blur-sm border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm transition-all duration-200"
            size="sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Start på nytt
          </Button>
        </div>
      </div>
    </div>
  );
};
