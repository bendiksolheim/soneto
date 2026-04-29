import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { AuthProvider, useAuth } from "../use-auth";

// biome-ignore lint/suspicious/noExplicitAny: test helper
type AnyUser = any;

const mockUser: AnyUser = {
  id: "user-123",
  email: "test@example.com",
  aud: "authenticated",
  role: "authenticated",
  created_at: "2025-01-01T00:00:00.000Z",
};

const mockSession: AnyUser = {
  user: mockUser,
  access_token: "token-abc",
  refresh_token: "refresh-abc",
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

  it("provides the initial user without fetching from Supabase", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider user={mockUser}>{children}</AuthProvider>,
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isLoading).toBe(false);

    const supabase = vi.mocked(createClient)();
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });

  it("fetches user from Supabase when no initial user", async () => {
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      // biome-ignore lint/suspicious/noExplicitAny: test mock
      from: vi.fn() as any,
      // biome-ignore lint/suspicious/noExplicitAny: test mock
    } as any);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider user={null}>{children}</AuthProvider>,
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
  });

  it("updates user and session on auth state change", async () => {
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    let capturedCallback: ((event: string, session: any) => void) | null = null;

    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        onAuthStateChange: vi.fn((cb) => {
          capturedCallback = cb;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      // biome-ignore lint/suspicious/noExplicitAny: test mock
      from: vi.fn() as any,
      // biome-ignore lint/suspicious/noExplicitAny: test mock
    } as any);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider user={null}>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      capturedCallback?.("SIGNED_IN", mockSession);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.session).toEqual(mockSession);
  });

  it("clears user and session on sign out", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider user={mockUser}>{children}</AuthProvider>,
    });

    expect(result.current.user).toEqual(mockUser);

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();

    const supabase = vi.mocked(createClient)();
    expect(supabase.auth.signOut).toHaveBeenCalledOnce();
  });
});

describe("useAuth", () => {
  it("throws when used outside AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within an AuthProvider",
    );
  });
});
