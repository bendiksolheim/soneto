import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "../card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText("Card content")).toBeTruthy();
  });

  it("renders title when provided", () => {
    render(<Card title="My Card">content</Card>);
    const heading = screen.getByRole("heading", { name: "My Card" });
    expect(heading).toBeTruthy();
    expect(heading).toHaveClass("card-title");
  });

  it("does not render a heading when title is omitted", () => {
    render(<Card>content</Card>);
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("renders actions slot when provided", () => {
    render(<Card actions={<button type="button">Action</button>}>content</Card>);
    expect(screen.getByRole("button", { name: "Action" })).toBeTruthy();
  });

  it("does not render actions container when actions is omitted", () => {
    const { container } = render(<Card>content</Card>);
    expect(container.querySelector(".card-actions")).toBeNull();
  });

  it("merges custom className", () => {
    const { container } = render(<Card className="custom-class">content</Card>);
    expect(container.firstChild).toHaveClass("custom-class");
  });
});
