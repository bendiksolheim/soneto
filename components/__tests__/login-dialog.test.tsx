import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../../test/utils/test-utils";
import { LoginDialog } from "../login-dialog";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

describe("LoginDialog", () => {
  it("renders login heading when open", () => {
    render(<LoginDialog isOpen={true} setIsOpen={vi.fn()} />);
    expect(screen.getByText("Logg inn")).toBeTruthy();
  });

  it("renders GitHub login button", () => {
    render(<LoginDialog isOpen={true} setIsOpen={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Logg inn med Github/i, hidden: true })).toBeTruthy();
  });

  it("calls signInWithOAuth with github provider when button is clicked", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ error: null });
    const { createClient } = await import("@/lib/supabase/client");
    vi.mocked(createClient).mockReturnValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        signInWithOAuth,
      },
      from: vi.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: test mock
    } as any);

    render(<LoginDialog isOpen={true} setIsOpen={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Logg inn med Github/i, hidden: true }));

    await waitFor(() => {
      expect(signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: "github" }),
      );
    });
  });
});
