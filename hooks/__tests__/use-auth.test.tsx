import { act, render, renderHook, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, type AuthUser, useAuth } from "../use-auth";

vi.mock("next-auth/react", () => ({
  signOut: vi.fn().mockResolvedValue(undefined),
}));

const mockUser: AuthUser = {
  id: "github-123456",
  name: "Test User",
  email: "test@example.com",
  image: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AuthProvider", () => {
  it("renders children", () => {
    render(
      <AuthProvider user={null}>
        <span>child</span>
      </AuthProvider>,
    );
    expect(screen.getByText("child")).toBeTruthy();
  });

  it("provides the user from props immediately", () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider user={mockUser}>{children}</AuthProvider>,
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isLoading).toBe(false);
  });

  it("provides null user when not authenticated", () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider user={null}>{children}</AuthProvider>,
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("calls nextAuthSignOut on signOut", async () => {
    const { signOut: nextAuthSignOut } = await import("next-auth/react");

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider user={mockUser}>{children}</AuthProvider>,
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(nextAuthSignOut).toHaveBeenCalledOnce();
  });
});

describe("useAuth", () => {
  it("throws when used outside AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within an AuthProvider",
    );
  });
});
