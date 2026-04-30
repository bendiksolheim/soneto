import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeTruthy();
  });

  it("applies variant class", () => {
    render(<Button variant="primary">Click</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-primary");
  });

  it("applies ghost variant class", () => {
    render(<Button variant="ghost">Click</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-ghost");
  });

  it("applies size class", () => {
    render(<Button size="lg">Click</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-lg");
  });

  it("defaults to btn-sm when no size is given", () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-sm");
  });

  it("applies btn-circle when circle is true", () => {
    render(<Button circle>X</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-circle");
  });

  it("applies btn-disabled when disabled is true", () => {
    render(<Button disabled>Click</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-disabled");
  });

  it("applies btn-active when active is true", () => {
    render(<Button active>Click</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-active");
  });

  it("calls onClick when clicked", () => {
    const handler = vi.fn();
    render(<Button onClick={handler}>Click</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(handler).toHaveBeenCalledOnce();
  });

  it("merges custom className", () => {
    render(<Button className="custom-class">Click</Button>);
    expect(screen.getByRole("button")).toHaveClass("custom-class");
  });
});
