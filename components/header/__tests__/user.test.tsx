import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../../../test/utils/test-utils";
import { User } from "../user";

// biome-ignore lint/suspicious/noExplicitAny: test helper
type AnyUser = any;

const mockUser: AnyUser = {
  id: "user-123",
  email: "test@example.com",
  aud: "authenticated",
  role: "authenticated",
  created_at: "2025-01-01T00:00:00.000Z",
  identities: [{ identity_data: { full_name: "Ola Nordmann" } }],
};

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

describe("User", () => {
  it("shows nothing while auth is loading", () => {
    // Without a user prop, isLoading starts true until getUser() resolves
    const { container } = render(<User />);
    expect(container.firstChild).toBeNull();
  });

  it("shows Logg inn button when logged out", async () => {
    render(<User />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Logg inn/i })).toBeTruthy();
    });
  });

  it("shows greeting with user name when logged in", () => {
    render(<User />, { user: mockUser });
    expect(screen.getByRole("button", { name: /Hei, Ola Nordmann/i })).toBeTruthy();
  });

  it("opens login dialog when Logg inn is clicked", async () => {
    render(<User />);
    await waitFor(() => screen.getByRole("button", { name: /Logg inn/i }));

    fireEvent.click(screen.getByRole("button", { name: /Logg inn/i }));

    const dialog = document.querySelector("dialog")!;
    expect(dialog.showModal).toHaveBeenCalled();
  });
});
