"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, MapPin, Mouse, Save, Route, RotateCcw, Clock } from "lucide-react";

export function Help() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "?" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // Only trigger if not in an input field
        const target = event.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          event.preventDefault();
          setIsOpen(true);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="fixed bottom-6 right-6 z-30 h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 p-0"
        >
          <HelpCircle className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Velkommen til SoneTo!
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Step 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <h3 className="font-semibold">Planlegg din rute</h3>
            </div>
            <div className="ml-8 space-y-2">
              <div className="flex items-start gap-3">
                <Mouse className="w-4 h-4 mt-1 text-gray-500" />
                <div>
                  <p className="text-sm">
                    <strong>Klikk på kartet</strong> for å sette startpunkt
                  </p>
                  <p className="text-xs text-gray-600">
                    Første klikk markerer hvor du starter løpeturen
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mouse className="w-4 h-4 mt-1 text-gray-500" />
                <div>
                  <p className="text-sm">
                    <strong>Fortsett å klikke</strong> for å bygge ruten
                  </p>
                  <p className="text-xs text-gray-600">
                    Hver klikk legger til et nytt punkt på ruten din
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <h3 className="font-semibold">Se statistikk og juster tempo</h3>
            </div>
            <div className="ml-8 space-y-2">
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 mt-1 text-gray-500" />
                <div>
                  <p className="text-sm">
                    <strong>Distanse og tid</strong> beregnes automatisk
                  </p>
                  <p className="text-xs text-gray-600">
                    Se total distanse og estimert tid basert på ditt tempo
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 mt-1 bg-gray-300 rounded-sm"></div>
                <div>
                  <p className="text-sm">
                    <strong>Juster temposlider</strong> for å endre tempo
                  </p>
                  <p className="text-xs text-gray-600">
                    Flytt slideren mellom 2:00 og 12:00 min/km
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <h3 className="font-semibold">Lagre ruten din</h3>
            </div>
            <div className="ml-8 space-y-2">
              <div className="flex items-start gap-3">
                <Save className="w-4 h-4 mt-1 text-gray-500" />
                <div>
                  <p className="text-sm">
                    <strong>Skriv inn et navn</strong> for ruten din
                  </p>
                  <p className="text-xs text-gray-600">
                    Velg et beskrivende navn som "Morgenløp" eller "5km runde"
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Save className="w-4 h-4 mt-1 text-gray-500" />
                <div>
                  <p className="text-sm">
                    <strong>Trykk "Lagre løype"</strong> eller Enter
                  </p>
                  <p className="text-xs text-gray-600">
                    Ruten lagres permanent og kan lastes senere
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                4
              </div>
              <h3 className="font-semibold">Last inn lagrede ruter</h3>
            </div>
            <div className="ml-8 space-y-2">
              <div className="flex items-start gap-3">
                <Route className="w-4 h-4 mt-1 text-gray-500" />
                <div>
                  <p className="text-sm">
                    <strong>Klikk "Lagrede løyper"</strong> i menyen
                  </p>
                  <p className="text-xs text-gray-600">
                    Se alle dine lagrede ruter med distanse og dato
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mouse className="w-4 h-4 mt-1 text-gray-500" />
                <div>
                  <p className="text-sm">
                    <strong>Klikk på en rute</strong> for å laste den inn
                  </p>
                  <p className="text-xs text-gray-600">
                    Ruten vises på kartet og du kan justere tempo
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Tips */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
              Nyttige tips
            </h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <RotateCcw className="w-3 h-3 mt-1 flex-shrink-0" />
                <span>Bruk "Start på nytt" for å slette gjeldende rute og begynne på nytt</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-3 h-3 mt-1 flex-shrink-0" />
                <span>Zoom inn på kartet for mer presise rutepunkter</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="w-3 h-3 mt-1 flex-shrink-0" />
                <span>Estimert tid baseres på konstant tempo - ta høyde for pauser og terreng</span>
              </li>
              <li className="flex items-start gap-2">
                <HelpCircle className="w-3 h-3 mt-1 flex-shrink-0" />
                <span>Trykk "?" på tastaturet for å åpne denne hjelpen raskt</span>
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
