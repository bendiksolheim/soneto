import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dropdown } from "../dropdown";

describe("Dropdown", () => {
  it("renders title in trigger button", () => {
    render(<Dropdown title="Open menu">content</Dropdown>);
    expect(screen.getByRole("button", { name: "Open menu" })).toBeTruthy();
  });

  it("renders children in dropdown content when opened", () => {
    render(<Dropdown title="Menu">dropdown content</Dropdown>);
    expect(screen.queryByText("dropdown content")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByText("dropdown content")).toBeTruthy();
  });

  it("defaults to dropdown-center when placement is omitted", () => {
    const { container } = render(<Dropdown title="Menu">content</Dropdown>);
    expect(container.firstChild).toHaveClass("dropdown-center");
  });

  it("applies correct placement class", () => {
    const { container } = render(
      <Dropdown title="Menu" placement="end">
        content
      </Dropdown>,
    );
    expect(container.firstChild).toHaveClass("dropdown-end");
  });

  it("applies dropdown-top placement", () => {
    const { container } = render(
      <Dropdown title="Menu" placement="top">
        content
      </Dropdown>,
    );
    expect(container.firstChild).toHaveClass("dropdown-top");
  });

  it("applies custom classNames", () => {
    const { container } = render(
      <Dropdown title="Menu" classNames={{ dropdown: "my-dropdown", button: "my-btn" }}>
        content
      </Dropdown>,
    );
    expect(container.firstChild).toHaveClass("my-dropdown");
    expect(screen.getByRole("button")).toHaveClass("my-btn");
  });

  it("toggles dropdown-open class when trigger is clicked", () => {
    const { container } = render(<Dropdown title="Menu">content</Dropdown>);
    expect(container.firstChild).not.toHaveClass("dropdown-open");
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(container.firstChild).toHaveClass("dropdown-open");
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(container.firstChild).not.toHaveClass("dropdown-open");
  });

  it("closes when clicking outside", () => {
    const { container } = render(
      <div>
        <Dropdown title="Menu">dropdown content</Dropdown>
        <div data-testid="outside">outside</div>
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByText("dropdown content")).toBeTruthy();
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByText("dropdown content")).toBeNull();
    expect(container.querySelector(".dropdown")).not.toHaveClass("dropdown-open");
  });
});
