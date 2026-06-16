"use client";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { UserCircleIcon } from "@/icons";
import { cn } from "@/lib/utils";
import { Button, Dropdown, Menu } from "../base";
import { LoginDialog } from "../login-dialog";

type UserProps = { className?: string };

export function User({ className }: UserProps): React.ReactElement | null {
  const { user, isLoading, signOut } = useAuth();
  const name = user?.name || "der";
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  if (isLoading) {
    return null;
  }

  if (user) {
    return (
      <Dropdown
        title={`Hei, ${name}!`}
        classNames={{ dropdown: cn("justify-self-end content-center", className) }}
        placement="end"
      >
        <Menu
          items={[
            {
              id: "logg-ut",
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
      <div className={cn("content-center justify-self-end", className)}>
        <Button onClick={() => setAuthDialogOpen(true)}>
          <UserCircleIcon size={16} />
          Logg inn
        </Button>
        <LoginDialog isOpen={authDialogOpen} setIsOpen={() => setAuthDialogOpen(false)} />
      </div>
    );
  }
}
