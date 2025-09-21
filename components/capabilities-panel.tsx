"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
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
import { MapPin, Route, Calendar, Trash2, MoveVertical, Save, Download } from "lucide-react";
import { toast } from "sonner";
import { RouteWithCalculatedData } from "@/lib/types/route";
import { Point } from "@/lib/map/point";
import { ElevationProfile } from "./elevation-profile";

interface CapabilitiesPanelProps {
  // Route data
  routePoints: Array<Point>;
  distance: number;
  elevationData: Array<{ distance: number; elevation: number; coordinate: [number, number] }>;
  
  // Pace controls
  paceInSeconds: number;
  onPaceChange: (pace: number) => void;
  
  // Route management
  routes: RouteWithCalculatedData[];
  onRouteLoad: (routePoints: Array<Point>, routeName: string) => void;
  deleteRoute: (id: string) => Promise<boolean>;
  
  // Actions
  onSaveRoute: (name: string) => void;
  onExportGPX: () => void;
  onResetRoute: () => void;
}

export function CapabilitiesPanel(props: CapabilitiesPanelProps) {
  const {
    routePoints,
    distance,
    elevationData,
    paceInSeconds,
    onPaceChange,
    routes,
    onRouteLoad,
    deleteRoute,
    onSaveRoute,
    onExportGPX,
    onResetRoute,
  } = props;

  const [isPacePopupOpen, setIsPacePopupOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [routeName, setRouteName] = useState("");
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const time = useMemo(() => {
    return Number((distance * paceInSeconds) / 60).toFixed(0);
  }, [distance, paceInSeconds]);

  const formatPace = (pace: number) => {
    const minutes = Math.floor(pace / 60);
    const seconds = Math.round(pace - minutes * 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handlePaceChange = (value: number[]) => {
    onPaceChange(value[0]);
  };

  const handleRouteSelect = (route: RouteWithCalculatedData) => {
    onRouteLoad(route.points, route.name);
  };

  const handleRouteDelete = async (e: React.MouseEvent, routeId: string, routeName: string) => {
    e.stopPropagation();
    if (confirm(`Delete route "${routeName}"?`)) {
      try {
        await deleteRoute(routeId);
        toast.success("Route deleted successfully");
      } catch {
        toast.error("Failed to delete route");
      }
    }
  };

  // Close pace popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsPacePopupOpen(false);
      }
    };

    if (isPacePopupOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPacePopupOpen]);

  return (
    <div className="w-96 min-w-96 h-full bg-white border-r border-gray-200 flex flex-col lg:w-96 md:w-80 sm:w-72">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-full">
              <MapPin strokeWidth={1} className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-gray-900">Soneto</span>
          </div>
          
          {/* Saved Routes */}
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>
                  <Route className="w-4 h-4" />
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-80 p-2">
                    {routes.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        <Route className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">Ingen lagrede løyper</p>
                        <p className="text-xs mt-1">Lagre din første løype for å se den her</p>
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-60 overflow-y-auto">
                        {routes.map((route) => (
                          <div
                            key={route.id}
                            onClick={() => handleRouteSelect(route)}
                            className="flex items-center justify-between p-3 rounded-md hover:bg-accent cursor-pointer group"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <Route className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {route.name}
                                  </p>
                                  <div className="flex items-center space-x-3 mt-1">
                                    <span className="text-xs text-gray-500">
                                      {route.distance.toFixed(1)} km
                                    </span>
                                    <div className="flex items-center space-x-1">
                                      <Calendar className="w-3 h-3 text-gray-400" />
                                      <span className="text-xs text-gray-500">
                                        {new Date(route.createdAt).toLocaleDateString('nb-NO')}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <Button
                              onClick={(e) => handleRouteDelete(e, route.id, route.name)}
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      </div>

      {/* Route Info */}
      <div className="p-4 border-b border-gray-100">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Løypeinfo</span>
          </div>
          
          <div className="flex items-center justify-between relative">
            <div className="text-lg font-semibold">
              {distance.toFixed(2)} km
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600" title={`Basert på ${formatPace(paceInSeconds)} min/km`}>
                {time} min
              </span>
              <Button
                ref={buttonRef}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-gray-100 rounded"
                onClick={() => setIsPacePopupOpen(!isPacePopupOpen)}
              >
                <MoveVertical className="w-3 h-3 text-gray-600" />
              </Button>
            </div>

            {isPacePopupOpen && (
              <div
                ref={popupRef}
                className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-64 z-50"
              >
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-sm text-gray-500">{formatPace(paceInSeconds)} min/km</div>
                  </div>
                  <div className="px-1">
                    <Slider
                      value={[paceInSeconds]}
                      onValueChange={handlePaceChange}
                      max={720}
                      min={120}
                      step={10}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>2:00</span>
                      <span>12:00</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Elevation Profile */}
      <div className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Høydeprofil</span>
          </div>
          {elevationData.length > 0 ? (
            <div className="h-24">
              <ElevationProfile
                elevationData={elevationData}
                totalDistance={distance}
                isVisible={true}
              />
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center text-sm text-gray-500 bg-gray-50 rounded-lg">
              Legg til punkter for å se høydeprofil
            </div>
          )}
        </div>
      </div>

      {/* Spacer to push actions to bottom */}
      <div className="flex-1"></div>

      {/* Actions */}
      <div className="p-4">
        <div className="space-y-2">
          {/* Save Route */}
          <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
            <DialogTrigger asChild>
              <Button className="w-full justify-start" variant="outline" disabled={routePoints.length === 0}>
                <Save className="w-4 h-4 mr-2" />
                Lagre løype
              </Button>
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

          {/* Export GPX */}
          <Button className="w-full justify-start" variant="outline" onClick={onExportGPX} disabled={routePoints.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Eksporter GPX
          </Button>

          {/* Reset Route */}
          <Button 
            className="w-full justify-start" 
            variant="destructive" 
            onClick={onResetRoute}
            disabled={routePoints.length === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Slett løype
          </Button>
        </div>
      </div>
    </div>
  );
}