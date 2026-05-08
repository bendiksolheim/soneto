import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../../test/utils/test-utils";
import { LoginDialog } from "../login-dialog";

vi.mock("next-auth/react", () => ({
  signIn: vi.fn().mockResolvedValue(undefined),
}));

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

  it("calls signIn with github provider when button is clicked", async () => {
    const { signIn } = await import("next-auth/react");

    render(<LoginDialog isOpen={true} setIsOpen={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Logg inn med Github/i, hidden: true }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("github");
    });
  });
});
