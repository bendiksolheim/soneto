"use client";

import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { LogIn, MapPin, Route, Calendar, Trash2 } from "lucide-react";
import { useRoutes } from "@/hooks/use-routes";
import { toast } from "sonner";

interface MenuBarProps {
  onRouteLoad?: (routePoints: [number, number][], routeName: string) => void;
}

export function MenuBar({ onRouteLoad }: MenuBarProps) {
  const { routes, deleteRoute } = useRoutes();

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
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-4xl px-4">
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-full shadow-lg px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Routes Section */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-full">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-900">SoneTo</span>
            </div>
          </div>

          {/* Routes Navigation Menu */}
          <div className="flex items-center">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="h-8 px-3 text-sm">
                    <Route className="w-4 h-4 mr-2" />
                    Lagrede løyper{" "}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-80 p-2">
                      {routes.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          <Route className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm">No saved routes yet</p>
                          <p className="text-xs mt-1">Create and save a route to see it here</p>
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
