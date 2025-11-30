"use client";
import { useRoutes } from "@/hooks/use-routes";
import { cn } from "@/lib/utils";
import { Point } from "@/lib/map/point";
import { RouteWithCalculatedData } from "@/lib/types/route";
import { Button, Card, Dropdown } from "../base";
import { ArrowRightCircleIcon, FolderIcon, FolderPlusIcon, XCircleIcon } from "@/icons";
import { useState } from "react";

type ChooseRouteProps = {
  className?: string;
  points: Array<Point>;
  onRouteLoad: (route: Array<Point>) => void;
  onClearPoints: () => void;
};

export function ChooseRoute({
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
    <Dropdown
      title={
        <>
          <FolderIcon size={16} /> Mine løyper
        </>
      }
      classNames={{
        dropdown: "content-center",
        button: "join-item",
        content: "w-96",
      }}
    >
      <Card title="Mine lagrede løyper" className="card-border card-sm shadow-md">
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
      </Card>
    </Dropdown>
  );
}

type SaveRouteDropdownProps = { onSave: (name: string) => Promise<unknown> };

function SaveRouteDropdown({ onSave }: SaveRouteDropdownProps): React.ReactElement {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <Dropdown
      title={
        <>
          <FolderPlusIcon size={16} /> Lagre løype
        </>
      }
      classNames={{
        dropdown: "content-center",
        button: "join-item",
      }}
    >
      <Card title="Lagre løype" className="card-border card-sm shadow-md">
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
          <p className="label">Gi løypen et beskrivende navn slik at du lett finner den senere</p>
        </div>
      </Card>
    </Dropdown>
  );
}

type ClearPointsDropdownProps = { onClear: () => void };
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
