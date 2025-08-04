"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { MapPin, Route, Calendar, Trash2, MoveVertical } from "lucide-react";
import { toast } from "sonner";
import { RouteWithCalculatedData } from "@/lib/types/route";
import { useMemo, useState, useRef, useEffect } from "react";
import { Point } from "@/lib/map/point";

interface MenuBarProps {
  onRouteLoad?: (routePoints: Array<Point>, routeName: string) => void;
  routes: RouteWithCalculatedData[];
  deleteRoute: (id: string) => Promise<boolean>;
  distance: number;
  paceInSeconds: number;
  onPaceChange: (pace: number) => void;
}

export function MenuBar(props: MenuBarProps) {
  const { onRouteLoad, routes, deleteRoute, distance, paceInSeconds, onPaceChange } = props;
  const [isPacePopupOpen, setIsPacePopupOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const handleRouteSelect = (route: any) => {
    if (onRouteLoad) {
      onRouteLoad(route.points, route.name);
    } else {
      toast.info(`Loading route: ${route.name}`);
    }
  };

  const handleRouteDelete = async (e: React.MouseEvent, routeId: string, routeName: string) => {
    e.stopPropagation();
    if (confirm(`Delete route "${routeName}"?`)) {
      try {
        await deleteRoute(routeId);
        toast.success("Route deleted successfully");
      } catch (error) {
        toast.error("Failed to delete route");
      }
    }
  };

  const time = useMemo(() => {
    return Number((distance * paceInSeconds) / 60).toFixed(0);
  }, [distance, paceInSeconds]);

  const handlePaceChange = (value: number[]) => {
    onPaceChange(value[0]);
  };

  const formatPace = (pace: number) => {
    const minutes = Math.floor(pace / 60);
    const seconds = Math.round(pace - minutes * 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Close popup when clicking outside
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
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4">
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-full shadow-lg px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Logo and Routes Section */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-6 h-6 bg-primary rounded-full">
              <MapPin strokeWidth={1} className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold text-gray-900">Sone To</span>
          </div>

          <div className="flex items-center space-x-0 relative">
            <span className="text-sm">
              {distance.toFixed(2)} km |{" "}
              <span title={`Basert på ${formatPace(paceInSeconds)} min/km`}>{time} min</span>
            </span>
            <Button
              ref={buttonRef}
              variant="ghost"
              size="sm"
              className="h-5 w-5 ml-0 p-0 hover:bg-gray-100 rounded"
              onClick={() => setIsPacePopupOpen(!isPacePopupOpen)}
            >
              <MoveVertical className="w-3 h-3 text-black" />
            </Button>

            {isPacePopupOpen && (
              <div
                ref={popupRef}
                className="absolute top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-64 z-50"
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

          {/* Routes Navigation Menu */}
          <div className="flex items-center">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="h-7 px-2 text-sm">
                    <Route strokeWidth={1} className="w-4 h-4 mr-2" />
                    <span className="font-normal text-sm">Lagrede løyper </span>
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-72 p-2">
                      {routes.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          <Route className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm">Kommer!</p>
                          <p className="text-xs mt-1">Vi jobber med muligheten til å lagre ruter</p>
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
                                          {new Date(route.createdAt).toLocaleDateString()}
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
      </div>
    </div>
  );
}
