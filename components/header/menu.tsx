"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRoutes } from "@/hooks/use-routes";
import {
  ArrowRightCircleIcon,
  FolderIcon,
  FolderPlusIcon,
  UserCircleIcon,
  XCircleIcon,
} from "@/icons";
import type { Point } from "@/lib/map/point";
import type { RouteWithCalculatedData } from "@/lib/types/route";
import { Button } from "../base/button";
import { LoginButton } from "../login-button";

type MenuProps = {
  points: Array<Point>;
  onClose: () => void;
  onRouteLoad: (route: Array<Point>) => void;
  onClearPoints: () => void;
};

// Full-page menu below the header bar, used on all screen sizes. Actions that change
// the map (loading a route, clearing points) close the menu so the result is visible;
// saving keeps it open so the new route shows up in the list.
export function Menu({
  points,
  onClose,
  onRouteLoad,
  onClearPoints,
}: MenuProps): React.ReactElement {
  const routes = useRoutes();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-x-0 bottom-0 top-10 z-40 overflow-y-auto overscroll-contain bg-base-100 p-4">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <UserSection />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <MenuSection title="Lagre løype" icon={<FolderPlusIcon size={16} />}>
            <SaveRouteForm
              hasPoints={points.length > 0}
              onSave={(name) => routes.saveRoute({ name, points })}
            />
          </MenuSection>
          <MenuSection title="Mine løyper" icon={<FolderIcon size={16} />}>
            <RoutesList
              routes={routes.routes}
              onRouteLoad={(route) => {
                onRouteLoad(route);
                onClose();
              }}
              onRouteDelete={routes.deleteRoute}
            />
          </MenuSection>
        </div>
        <ClearPointsButton
          className="w-full"
          onClear={() => {
            onClearPoints();
            onClose();
          }}
        />
      </div>
    </div>
  );
}

type MenuSectionProps = React.PropsWithChildren<{
  title: string;
  icon: React.ReactNode;
}>;
function MenuSection({ title, icon, children }: MenuSectionProps): React.ReactElement {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 font-medium">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function UserSection(): React.ReactElement | null {
  const { user, isLoading, signOut } = useAuth();
  if (isLoading) {
    return null;
  }
  if (user) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCircleIcon size={16} />
          Hei, {user.name || "der"}!
        </div>
        <Button variant="ghost" onClick={() => signOut()}>
          Logg ut
        </Button>
      </div>
    );
  }
  return <LoginButton className="w-full" />;
}

type RoutesListProps = {
  routes: RouteWithCalculatedData[];
  onRouteLoad: (route: Array<Point>) => void;
  onRouteDelete: (routeId: string) => void;
};

function RoutesList({ routes, onRouteLoad, onRouteDelete }: RoutesListProps): React.ReactElement {
  if (routes.length === 0) {
    return <p className="label">Du har ingen lagrede løyper ennå</p>;
  }
  return (
    <ul>
      {routes.map((route) => (
        <li key={route.id} className="flex flex-row w-full items-center p-2">
          <div className="grow">{route.name}</div>
          <div className="join">
            <Button
              className="text-nowrap flex join-item"
              onClick={() => onRouteLoad(route.points)}
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
  );
}

type SaveRouteFormProps = {
  hasPoints: boolean;
  onSave: (name: string) => Promise<unknown>;
};

function SaveRouteForm({ hasPoints, onSave }: SaveRouteFormProps): React.ReactElement {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  return (
    <div className="fieldset">
      <legend className="fieldset-legend">Navn på løype</legend>
      <div className="join">
        <input
          type="text"
          className="input join-item"
          placeholder="Løypenavn"
          aria-label="Løypenavn"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
        />
        <Button
          size="md"
          className="join-item"
          onClick={() => {
            setSaving(true);
            setError(null);
            setSaved(false);
            onSave(name)
              .then(() => {
                setName("");
                setSaved(true);
              })
              .catch((err) => {
                setError(err instanceof Error ? err.message : "Kunne ikke lagre løypen");
              })
              .finally(() => setSaving(false));
          }}
          disabled={name === "" || saving || !hasPoints}
        >
          {saving ? "Lagrer…" : "Lagre"}
        </Button>
      </div>
      {error && <p className="label text-error">{error}</p>}
      {saved && <p className="label text-success">Løypen ble lagret</p>}
      {hasPoints ? (
        <p className="label">Gi løypen et beskrivende navn slik at du lett finner den senere</p>
      ) : (
        <p className="label">Plasser punkter på kartet først</p>
      )}
    </div>
  );
}

type ClearPointsButtonProps = { onClear: () => void; className?: string };
function ClearPointsButton(props: ClearPointsButtonProps): React.ReactElement {
  return (
    <Button variant="error" className={props.className} onClick={props.onClear}>
      <XCircleIcon size={16} />
      Slett punkter
    </Button>
  );
}
