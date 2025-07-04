"use client";

import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { MapPin, Route, Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RouteWithCalculatedData } from "@/lib/types/route";
import { useMemo } from "react";

interface MenuBarProps {
  onRouteLoad?: (routePoints: [number, number][], routeName: string) => void;
  routes: RouteWithCalculatedData[];
  deleteRoute: (id: string) => Promise<boolean>;
  distance: number;
  pace: number;
}

export function MenuBar(props: MenuBarProps) {
  const { onRouteLoad, routes, deleteRoute, distance, pace } = props;
  const handleRouteSelect = (route: any) => {
    if (onRouteLoad) {
      onRouteLoad(route.points, route.name);
      toast.success(`Loaded route: ${route.name}`);
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
    return Number(distance * pace).toFixed(0);
  }, [distance, pace]);

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

          <div>
            <span className="text-sm">
              {distance.toFixed(2)} km | {time} min
            </span>
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
