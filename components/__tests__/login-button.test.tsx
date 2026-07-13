import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "../../test/utils/test-utils";
import { LoginButton } from "../login-button";

vi.mock("next-auth/react", () => ({
  signIn: vi.fn().mockResolvedValue(undefined),
}));

describe("LoginButton", () => {
  it("renders GitHub login button", () => {
    render(<LoginButton />);
    expect(screen.getByRole("button", { name: /Logg inn med Github/i })).toBeTruthy();
  });

  it("calls signIn with github provider when button is clicked", async () => {
    const { signIn } = await import("next-auth/react");

    render(<LoginButton />);
    fireEvent.click(screen.getByRole("button", { name: /Logg inn med Github/i }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("github");
    });
  });
});
