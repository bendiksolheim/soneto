"use client";

import { Button } from "@/components/base";
import { useAuth } from "@/hooks/use-auth";
import { useRoutes } from "@/hooks/use-routes";
import { ArrowRightCircleIcon, FolderPlusIcon, UserCircleIcon, XCircleIcon } from "@/icons";
import { Point } from "@/lib/map/point";
import { RouteWithCalculatedData } from "@/lib/types/route";
import { useState } from "react";
import { UserMenu } from "./auth/user-menu";

type HeaderProps = {
  points: Array<Point>;
  onClearPoints: () => void;
  onRouteLoad: (route: Array<Point>) => void;
};

export function Header({ points, onClearPoints, onRouteLoad }: HeaderProps): React.ReactElement {
  const { user } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  return (
    <div className="flex justify-between items-center h-12">
      <div className="text-lg">Soneto</div>
      <ChooseRoute points={points} onRouteLoad={onRouteLoad} onClearPoints={onClearPoints} />
      {!user && (
        <Button onClick={() => setAuthDialogOpen(true)}>
          <UserCircleIcon size={16} />
          Logg inn
        </Button>
      )}
      <UserMenu />
    </div>
  );
}

type ChooseRouteProps = {
  points: Array<Point>;
  onRouteLoad: (route: Array<Point>) => void;
  onClearPoints: () => void;
};

function ChooseRoute({ points, onRouteLoad, onClearPoints }: ChooseRouteProps): React.ReactElement {
  const routes = useRoutes();
  return (
    <div className="join">
      <ListRoutesDropdown routes={routes.routes} onRouteLoad={onRouteLoad} />
      <SaveRouteDropdown onSave={(name) => routes.saveRoute({ name: name, points: points })} />
      <ClearPointsDropdown onClear={onClearPoints} />
    </div>
  );
}

type ListRoutesProps = {
  routes: RouteWithCalculatedData[];
  onRouteLoad: (route: Array<Point>) => void;
};

function ListRoutesDropdown({ routes, onRouteLoad }: ListRoutesProps): React.ReactElement {
  return (
    <div className="dropdown dropdown-center">
      <div tabIndex={0} role="button" className="btn btn-sm join-item">
        <FolderPlusIcon size={16} />
        Mine løyper
      </div>
      <div
        tabIndex={0}
        className="dropdown-content card card-border card-sm bg-base-100 z-1 w-96 shadow-md"
      >
        <div className="card-body">
          <div className="card-title">Mine lagrede ruter</div>
          <ul className="list">
            {routes.map((route) => (
              <li key={route.id} className="list-row p-2">
                <div className="list-col-grow">{route.name}</div>
                <div>
                  <Button
                    variant="ghost"
                    className="block text-nowrap whitespace-nowrap"
                    onClick={() => {
                      // @ts-ignore
                      document.activeElement.blur();
                      onRouteLoad(route.points);
                    }}
                  >
                    <ArrowRightCircleIcon size={16} /> Last inn
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SaveRouteDropdown({ onSave }: { onSave: (name: string) => void }): React.ReactElement {
  const [name, setName] = useState("");
  return (
    <div className="dropdown dropdown-center">
      <div tabIndex={0} role="button" className="btn btn-sm join-item">
        <FolderPlusIcon size={16} />
        Lagre løype
      </div>
      <div
        tabIndex={0}
        className="dropdown-content card card-border card-sm bg-base-100 z-1  shadow-md"
      >
        <div className="card-body">
          <div className="card-title">Lagre løype</div>
          <div className="fieldset">
            <legend className="fieldset-legend">Navn på løype</legend>
            <div className="join">
              <input
                type="text"
                className="input join-item"
                placeholder="Løypenavn"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Button
                size="md"
                className="join-item"
                onClick={() => onSave(name)}
                disabled={name === ""}
              >
                Lagre
              </Button>
            </div>
            <p className="label">
              Gi løypen et beskrivende navn slik at du lett skjønner det senere
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

type ClearPointsDropdownProps = {
  onClear: () => void;
};
function ClearPointsDropdown(props: ClearPointsDropdownProps): React.ReactElement {
  return (
    <Button variant="error" className="join-item" onClick={props.onClear}>
      <XCircleIcon size={16} />
      Slett punkter
    </Button>
  );
}
