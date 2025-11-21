"use client";

import { Button } from "@/components/base";
import { useAuth } from "@/hooks/use-auth";
import { useRoutes } from "@/hooks/use-routes";
import {
  ArrowRightCircleIcon,
  FolderIcon,
  FolderPlusIcon,
  UserCircleIcon,
  XCircleIcon,
} from "@/icons";
import { Point } from "@/lib/map/point";
import { RouteWithCalculatedData } from "@/lib/types/route";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Dropdown, Menu } from "./base";
import { LoginDialog } from "./login-dialog";

type HeaderProps = {
  points: Array<Point>;
  onClearPoints: () => void;
  onRouteLoad: (route: Array<Point>) => void;
};

export function Header({ points, onClearPoints, onRouteLoad }: HeaderProps): React.ReactElement {
  return (
    <div className="grid grid-cols-3 h-12">
      <div className="text-lg justify-self-start content-center">Soneto</div>
      <ChooseRoute
        className="justify-self-center content-center"
        points={points}
        onRouteLoad={onRouteLoad}
        onClearPoints={onClearPoints}
      />
      <User />
    </div>
  );
}

function User(): React.ReactElement {
  const { user, signOut } = useAuth();
  const name = user?.identities[0]?.identity_data?.full_name || "der";
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  if (user) {
    return (
      <Dropdown
        title={`Hei, ${name}!`}
        classNames={{ dropdown: "justify-self-end content-center" }}
        placement="end"
      >
        <Menu
          items={[
            {
              label: "Logg ut",
              action: () => {
                signOut();
              },
            },
          ]}
        />
      </Dropdown>
    );
  } else {
    return (
      <div className="content-center justify-self-end">
        <Button onClick={() => setAuthDialogOpen(true)}>
          <UserCircleIcon size={16} />
          Logg inn
        </Button>
        <LoginDialog isOpen={authDialogOpen} setIsOpen={() => setAuthDialogOpen(false)} />
      </div>
    );
  }
}

type ChooseRouteProps = {
  className?: string;
  points: Array<Point>;
  onRouteLoad: (route: Array<Point>) => void;
  onClearPoints: () => void;
};

function ChooseRoute({
  className,
  points,
  onRouteLoad,
  onClearPoints,
}: ChooseRouteProps): React.ReactElement {
  const routes = useRoutes();
  return (
    <div className={cn("join", className)}>
      <ListRoutesDropdown
        routes={routes.routes}
        onRouteLoad={onRouteLoad}
        onRouteDelete={routes.deleteRoute}
      />
      <SaveRouteDropdown onSave={(name) => routes.saveRoute({ name: name, points: points })} />
      <ClearPointsDropdown onClear={onClearPoints} />
    </div>
  );
}

type ListRoutesProps = {
  routes: RouteWithCalculatedData[];
  onRouteLoad: (route: Array<Point>) => void;
  onRouteDelete: (routeId: string) => void;
};

function ListRoutesDropdown({
  routes,
  onRouteLoad,
  onRouteDelete,
}: ListRoutesProps): React.ReactElement {
  return (
    <div className="dropdown dropdown-center content-center">
      <div tabIndex={0} role="button" className="btn btn-sm join-item">
        <FolderIcon size={16} />
        Mine løyper
      </div>
      <div
        tabIndex={0}
        className="dropdown-content card card-border card-sm bg-base-100 z-1 w-96 shadow-md"
      >
        <div className="card-body">
          <div className="card-title">Mine lagrede løyper</div>
          <ul>
            {routes.map((route) => (
              <li key={route.id} className="flex flex-row w-full p-2">
                <div className="grow">{route.name}</div>
                <div className="join">
                  <Button
                    className="text-nowrap flex join-item"
                    onClick={() => {
                      // @ts-ignore
                      document.activeElement.blur();
                      onRouteLoad(route.points);
                    }}
                  >
                    <ArrowRightCircleIcon size={16} /> Last inn
                  </Button>
                  <Button
                    variant="warning"
                    className="flex join-item"
                    onClick={() => onRouteDelete(route.id)}
                  >
                    <XCircleIcon size={16} />
                    Slett
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

function SaveRouteDropdown({
  onSave,
}: {
  onSave: (name: string) => Promise<unknown>;
}): React.ReactElement {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <div className="dropdown dropdown-center content-center">
      <div tabIndex={0} role="button" className="btn btn-sm join-item">
        <FolderPlusIcon size={16} />
        Lagre løype
      </div>
      <div tabIndex={0} className="dropdown-content">
        <div className="card card-border card-sm bg-base-100 z-1 shadow-md">
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
                  onClick={() => {
                    setSaving(true);
                    onSave(name).then(() => {
                      setSaving(false);
                      setName("");
                    });
                  }}
                  disabled={name === ""}
                >
                  Lagre
                </Button>
              </div>
              <p className="label">
                Gi løypen et beskrivende navn slik at du lett finner den senere
              </p>
            </div>
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
    <div className="join-item content-center">
      <Button variant="error" onClick={props.onClear}>
        <XCircleIcon size={16} />
        Slett punkter
      </Button>
    </div>
  );
}
