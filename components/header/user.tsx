"use client";
import { useAuth } from "@/hooks/use-auth";
import { UserCircleIcon } from "@/icons";
import { useState } from "react";
import { Dropdown, Menu, Button } from "../base";
import { LoginDialog } from "../login-dialog";

export function User(): React.ReactElement | null {
  const { user, isLoading, signOut } = useAuth();
  const name = user?.identities[0]?.identity_data?.full_name || "der";
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  if (isLoading) {
    return null;
  }

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
