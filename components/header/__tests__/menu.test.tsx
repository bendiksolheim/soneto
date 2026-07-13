import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "@/hooks/use-auth";
import { useRoutes } from "@/hooks/use-routes";
import type { Point } from "@/lib/map/point";
import type { RouteWithCalculatedData } from "@/lib/types/route";
import { render } from "../../../test/utils/test-utils";
import { Menu } from "../menu";

vi.mock("@/hooks/use-routes");
vi.mock("next-auth/react", () => ({
  signIn: vi.fn().mockResolvedValue(undefined),
  signOut: vi.fn().mockResolvedValue(undefined),
}));

const mockUser: AuthUser = {
  id: "user-123",
  name: "Ola Nordmann",
  email: "test@example.com",
  image: null,
};

const mockPoints: Array<Point> = [
  { latitude: 59.9139, longitude: 10.7522 },
  { latitude: 59.9249, longitude: 10.7632 },
];

const mockRoutes: RouteWithCalculatedData[] = [
  {
    id: "route-1",
    name: "Morgentur",
    points: mockPoints,
    createdAt: "2025-01-01T00:00:00.000Z",
    distance: 1500,
  },
];

const defaultMock = {
  routes: [],
  isLoading: false,
  error: null,
  saveRoute: vi.fn().mockResolvedValue({}),
  updateRoute: vi.fn(),
  deleteRoute: vi.fn(),
  clearAllRoutes: vi.fn(),
  getRoute: vi.fn(),
  refreshRoutes: vi.fn(),
  isCloudStorage: false,
};

const defaultProps = {
  points: mockPoints,
  onClose: vi.fn(),
  onRouteLoad: vi.fn(),
  onClearPoints: vi.fn(),
};

beforeEach(() => {
  vi.mocked(useRoutes).mockReturnValue({
    ...defaultMock,
    saveRoute: vi.fn().mockResolvedValue({}),
  });
});

describe("Menu", () => {
  it("shows login button when logged out", () => {
    render(<Menu {...defaultProps} />);
    expect(screen.getByRole("button", { name: /Logg inn med Github/i })).toBeTruthy();
  });

  it("shows greeting and Logg ut when logged in", () => {
    render(<Menu {...defaultProps} />, { user: mockUser });
    expect(screen.getByText(/Hei, Ola Nordmann!/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Logg ut/i })).toBeTruthy();
  });

  it("lists saved routes", () => {
    vi.mocked(useRoutes).mockReturnValue({ ...defaultMock, routes: mockRoutes });
    render(<Menu {...defaultProps} />);
    expect(screen.getByText("Morgentur")).toBeTruthy();
  });

  it("shows empty state when there are no saved routes", () => {
    render(<Menu {...defaultProps} />);
    expect(screen.getByText(/ingen lagrede løyper/i)).toBeTruthy();
  });

  it("loads a route and closes the menu when Last inn is clicked", () => {
    vi.mocked(useRoutes).mockReturnValue({ ...defaultMock, routes: mockRoutes });
    const onRouteLoad = vi.fn();
    const onClose = vi.fn();
    render(<Menu {...defaultProps} onRouteLoad={onRouteLoad} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /Last inn/i }));

    expect(onRouteLoad).toHaveBeenCalledWith(mockRoutes[0].points);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls deleteRoute with the route id when Slett in route list is clicked", () => {
    const deleteRoute = vi.fn();
    vi.mocked(useRoutes).mockReturnValue({ ...defaultMock, routes: mockRoutes, deleteRoute });
    render(<Menu {...defaultProps} />);

    const routeItem = screen.getByText("Morgentur").closest("li");
    fireEvent.click(within(routeItem).getByRole("button", { name: /Slett/i }));

    expect(deleteRoute).toHaveBeenCalledWith("route-1");
  });

  it("clears points and closes the menu when Slett punkter is clicked", () => {
    const onClearPoints = vi.fn();
    const onClose = vi.fn();
    render(<Menu {...defaultProps} onClearPoints={onClearPoints} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /Slett punkter/i }));

    expect(onClearPoints).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<Menu {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("save button is disabled when name is empty", () => {
    render(<Menu {...defaultProps} />);
    expect(screen.getByRole("button", { name: /^Lagre$/ })).toBeDisabled();
  });

  it("save button is disabled with a hint when there are no points", () => {
    render(<Menu {...defaultProps} points={[]} />);

    fireEvent.change(screen.getByPlaceholderText("Løypenavn"), {
      target: { value: "Min løype" },
    });

    expect(screen.getByRole("button", { name: /^Lagre$/ })).toBeDisabled();
    expect(screen.getByText(/Plasser punkter på kartet først/i)).toBeTruthy();
  });

  it("saves the route, shows success, and keeps the menu open", async () => {
    const saveRoute = vi.fn().mockResolvedValue({});
    vi.mocked(useRoutes).mockReturnValue({ ...defaultMock, saveRoute });
    const onClose = vi.fn();
    render(<Menu {...defaultProps} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText("Løypenavn"), {
      target: { value: "Min løype" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Lagre$/ }));

    expect(saveRoute).toHaveBeenCalledWith({ name: "Min løype", points: mockPoints });
    expect(await screen.findByText(/Løypen ble lagret/i)).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });
});
