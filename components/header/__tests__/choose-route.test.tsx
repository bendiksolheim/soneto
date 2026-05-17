import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRoutes } from "@/hooks/use-routes";
import type { RouteWithCalculatedData } from "@/lib/types/route";
import { render } from "../../../test/utils/test-utils";
import { ChooseRoute } from "../choose-route";

vi.mock("@/hooks/use-routes");

const mockRoutes: RouteWithCalculatedData[] = [
  {
    id: "route-1",
    name: "Morgentur",
    points: [
      { latitude: 59.9139, longitude: 10.7522 },
      { latitude: 59.9249, longitude: 10.7632 },
    ],
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

function openListDropdown() {
  fireEvent.click(screen.getByRole("button", { name: /Mine løyper/i }));
}

function openSaveDropdown() {
  fireEvent.click(screen.getByRole("button", { name: /Lagre løype/i }));
}

beforeEach(() => {
  vi.mocked(useRoutes).mockReturnValue({
    ...defaultMock,
    saveRoute: vi.fn().mockResolvedValue({}),
  });
});

describe("ChooseRoute", () => {
  it("renders Mine løyper and Lagre løype dropdown buttons", () => {
    render(<ChooseRoute points={[]} onRouteLoad={vi.fn()} onClearPoints={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Mine løyper/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Lagre løype/i })).toBeTruthy();
  });

  it("renders Slett punkter button", () => {
    render(<ChooseRoute points={[]} onRouteLoad={vi.fn()} onClearPoints={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Slett punkter/i })).toBeTruthy();
  });

  it("calls onClearPoints when Slett punkter is clicked", () => {
    const onClearPoints = vi.fn();
    render(<ChooseRoute points={[]} onRouteLoad={vi.fn()} onClearPoints={onClearPoints} />);
    fireEvent.click(screen.getByRole("button", { name: /Slett punkter/i }));
    expect(onClearPoints).toHaveBeenCalledOnce();
  });

  it("lists saved routes in the dropdown", () => {
    vi.mocked(useRoutes).mockReturnValue({ ...defaultMock, routes: mockRoutes });
    render(<ChooseRoute points={[]} onRouteLoad={vi.fn()} onClearPoints={vi.fn()} />);
    openListDropdown();
    expect(screen.getByText("Morgentur")).toBeTruthy();
  });

  it("calls onRouteLoad with the route's points when Last inn is clicked", () => {
    vi.mocked(useRoutes).mockReturnValue({ ...defaultMock, routes: mockRoutes });
    const onRouteLoad = vi.fn();
    render(<ChooseRoute points={[]} onRouteLoad={onRouteLoad} onClearPoints={vi.fn()} />);
    openListDropdown();

    fireEvent.click(screen.getByRole("button", { name: /Last inn/i }));

    expect(onRouteLoad).toHaveBeenCalledWith(mockRoutes[0].points);
  });

  it("calls deleteRoute with the route id when Slett in route list is clicked", () => {
    const deleteRoute = vi.fn();
    vi.mocked(useRoutes).mockReturnValue({ ...defaultMock, routes: mockRoutes, deleteRoute });
    render(<ChooseRoute points={[]} onRouteLoad={vi.fn()} onClearPoints={vi.fn()} />);
    openListDropdown();

    const routeItem = screen.getByText("Morgentur").closest("li");
    fireEvent.click(within(routeItem).getByRole("button", { name: /Slett/i }));

    expect(deleteRoute).toHaveBeenCalledWith("route-1");
  });

  it("save button is disabled when name is empty", () => {
    render(<ChooseRoute points={[]} onRouteLoad={vi.fn()} onClearPoints={vi.fn()} />);
    openSaveDropdown();
    const saveButton = screen.getByRole("button", { name: /^Lagre$/ });
    expect(saveButton).toBeDisabled();
  });

  it("save button is enabled and calls saveRoute after typing a name", () => {
    const saveRoute = vi.fn().mockResolvedValue({});
    vi.mocked(useRoutes).mockReturnValue({ ...defaultMock, saveRoute });
    render(<ChooseRoute points={[]} onRouteLoad={vi.fn()} onClearPoints={vi.fn()} />);
    openSaveDropdown();

    const input = screen.getByPlaceholderText("Løypenavn");
    fireEvent.change(input, { target: { value: "Min løype" } });

    const saveButton = screen.getByRole("button", { name: /^Lagre$/ });
    expect(saveButton).not.toBeDisabled();

    fireEvent.click(saveButton);
    expect(saveRoute).toHaveBeenCalledWith(expect.objectContaining({ name: "Min løype" }));
  });
});
