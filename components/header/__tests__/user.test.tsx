import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "@/hooks/use-auth";
import { render } from "../../../test/utils/test-utils";
import { User } from "../user";

vi.mock("next-auth/react", () => ({
  signOut: vi.fn().mockResolvedValue(undefined),
}));

const mockUser: AuthUser = {
  id: "user-123",
  name: "Ola Nordmann",
  email: "test@example.com",
  image: null,
};

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

describe("User", () => {
  it("shows Logg inn button when logged out", () => {
    render(<User />);
    expect(screen.getByRole("button", { name: /Logg inn/i })).toBeTruthy();
  });

  it("shows greeting with user name when logged in", () => {
    render(<User />, { user: mockUser });
    expect(screen.getByRole("button", { name: /Hei, Ola Nordmann/i })).toBeTruthy();
  });

  it("shows fallback greeting when user has no name", () => {
    render(<User />, { user: { ...mockUser, name: null } });
    expect(screen.getByRole("button", { name: /Hei, der!/i })).toBeTruthy();
  });

  it("opens login dialog when Logg inn is clicked", async () => {
    render(<User />);
    fireEvent.click(screen.getByRole("button", { name: /Logg inn/i }));

    await waitFor(() => {
      const dialog = document.querySelector("dialog")!;
      expect(dialog.showModal).toHaveBeenCalled();
    });
  });
});
