"use client";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRoutes } from "@/hooks/use-routes";
import {
  ArrowRightCircleIcon,
  BarsIcon,
  FolderIcon,
  FolderPlusIcon,
  UserCircleIcon,
  XCircleIcon,
} from "@/icons";
import type { Point } from "@/lib/map/point";
import type { RouteWithCalculatedData } from "@/lib/types/route";
import { cn } from "@/lib/utils";
import { Button } from "../base/button";
import { Card } from "../base/card";
import { Dropdown } from "../base/dropdown";
import { LoginButton } from "../login-dialog";

type ChooseRouteProps = {
  className?: string;
  points: Array<Point>;
  onRouteLoad: (route: Array<Point>) => void;
  onClearPoints: () => void;
};

// Desktop: three joined dropdowns. Hidden below `md`, where RouteMenu takes over.
export function ChooseRoute({
  className,
  points,
  onRouteLoad,
  onClearPoints,
}: ChooseRouteProps): React.ReactElement {
  const routes = useRoutes();
  return (
    <div className={cn("join", className)}>
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
        <RoutesList
          routes={routes.routes}
          onRouteLoad={onRouteLoad}
          onRouteDelete={routes.deleteRoute}
        />
      </Dropdown>
      <Dropdown
        title={
          <>
            <FolderPlusIcon size={16} /> Lagre løype
          </>
        }
        classNames={{ dropdown: "content-center", button: "join-item" }}
      >
        <SaveRouteForm onSave={(name) => routes.saveRoute({ name, points })} />
      </Dropdown>
      <div className="join-item content-center">
        <ClearPointsButton onClear={onClearPoints} />
      </div>
    </div>
  );
}

// Mobile: a hamburger that toggles a full-screen menu below the header bar. Route
// actions are collapsed into expandable sections so the menu opens to a clean list
// rather than a wall of forms. Hidden at `md` and up, where ChooseRoute/User take over.
export function MobileMenu({
  className,
  points,
  onRouteLoad,
  onClearPoints,
}: ChooseRouteProps): React.ReactElement {
  const routes = useRoutes();
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);
  return (
    <div className={className}>
      <Button square active={isOpen} onClick={() => setIsOpen((v) => !v)}>
        <BarsIcon size={20} />
      </Button>
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 top-10 z-40 flex flex-col gap-2 overflow-y-auto overscroll-contain bg-base-100 p-4">
          <UserMenuSection />
          <MenuSection title="Mine løyper" icon={<FolderIcon size={16} />}>
            <RoutesListContent
              routes={routes.routes}
              onRouteLoad={(route) => {
                onRouteLoad(route);
                close();
              }}
              onRouteDelete={routes.deleteRoute}
            />
          </MenuSection>
          <MenuSection title="Lagre løype" icon={<FolderPlusIcon size={16} />}>
            <SaveRouteFormContent onSave={(name) => routes.saveRoute({ name, points })} />
          </MenuSection>
          <ClearPointsButton
            onClear={() => {
              onClearPoints();
              close();
            }}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}

type MenuSectionProps = React.PropsWithChildren<{
  title: string;
  icon: React.ReactNode;
}>;
function MenuSection({ title, icon, children }: MenuSectionProps): React.ReactElement {
  return (
    <div className="collapse collapse-arrow border border-base-300 bg-base-100">
      <input type="checkbox" aria-label={title} />
      <div className="collapse-title flex items-center gap-2 font-medium">
        {icon}
        {title}
      </div>
      <div className="collapse-content">{children}</div>
    </div>
  );
}

function UserMenuSection(): React.ReactElement | null {
  const { user, isLoading, signOut } = useAuth();
  if (isLoading) {
    return null;
  }
  if (user) {
    return (
      <Button variant="ghost" className="w-full justify-start" onClick={() => signOut()}>
        <UserCircleIcon size={16} />
        Logg ut ({user.name})
      </Button>
    );
  }
  return <LoginButton className="w-full" />;
}

type RoutesListProps = {
  routes: RouteWithCalculatedData[];
  onRouteLoad: (route: Array<Point>) => void;
  onRouteDelete: (routeId: string) => void;
};

function RoutesList(props: RoutesListProps): React.ReactElement {
  return (
    <Card title="Mine lagrede løyper" className="card-border card-sm shadow-md">
      <RoutesListContent {...props} />
    </Card>
  );
}

function RoutesListContent({
  routes,
  onRouteLoad,
  onRouteDelete,
}: RoutesListProps): React.ReactElement {
  return (
    <ul>
      {routes.map((route) => (
        <li key={route.id} className="flex flex-row w-full p-2">
          <div className="grow">{route.name}</div>
          <div className="join">
            <Button
              className="text-nowrap flex join-item"
              onClick={() => {
                // @ts-expect-error
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
  );
}

type SaveRouteFormProps = { onSave: (name: string) => Promise<unknown> };

function SaveRouteForm(props: SaveRouteFormProps): React.ReactElement {
  return (
    <Card title="Lagre løype" className="card-border card-sm shadow-md">
      <SaveRouteFormContent {...props} />
    </Card>
  );
}

function SaveRouteFormContent({ onSave }: SaveRouteFormProps): React.ReactElement {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          size="md"
          className="join-item"
          onClick={() => {
            setSaving(true);
            setError(null);
            onSave(name)
              .then(() => {
                setName("");
              })
              .catch((err) => {
                setError(err instanceof Error ? err.message : "Kunne ikke lagre løypen");
              })
              .finally(() => setSaving(false));
          }}
          disabled={name === "" || saving}
        >
          {saving ? "Lagrer…" : "Lagre"}
        </Button>
      </div>
      {error && <p className="label text-error">{error}</p>}
      <p className="label">Gi løypen et beskrivende navn slik at du lett finner den senere</p>
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
