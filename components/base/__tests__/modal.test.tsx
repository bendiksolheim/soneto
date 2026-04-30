import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Modal } from "../modal";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

describe("Modal", () => {
  it("renders children inside the modal box", () => {
    render(
      <Modal isOpen={false} setIsOpen={vi.fn()}>
        Modal content
      </Modal>,
    );
    expect(screen.getByText("Modal content")).toBeTruthy();
  });

  it("calls showModal when isOpen becomes true", () => {
    const { container } = render(
      <Modal isOpen={true} setIsOpen={vi.fn()}>
        content
      </Modal>,
    );
    const dialog = container.querySelector("dialog")!;
    expect(dialog.showModal).toHaveBeenCalledOnce();
  });

  it("calls close when isOpen is false", () => {
    const { container } = render(
      <Modal isOpen={false} setIsOpen={vi.fn()}>
        content
      </Modal>,
    );
    const dialog = container.querySelector("dialog")!;
    expect(dialog.close).toHaveBeenCalledOnce();
  });

  it("calls setIsOpen(false) when close button is clicked", () => {
    const setIsOpen = vi.fn();
    render(
      <Modal isOpen={true} setIsOpen={setIsOpen}>
        content
      </Modal>,
    );
    fireEvent.click(screen.getByRole("button", { name: "✕", hidden: true }));
    expect(setIsOpen).toHaveBeenCalledWith(false);
  });

  it("calls setIsOpen(false) when backdrop button is clicked", () => {
    const setIsOpen = vi.fn();
    render(
      <Modal isOpen={true} setIsOpen={setIsOpen}>
        content
      </Modal>,
    );
    fireEvent.click(screen.getByRole("button", { name: "close", hidden: true }));
    expect(setIsOpen).toHaveBeenCalledWith(false);
  });

  it("applies custom className to dialog", () => {
    const { container } = render(
      <Modal isOpen={false} setIsOpen={vi.fn()} className="custom-modal">
        content
      </Modal>,
    );
    expect(container.querySelector("dialog")).toHaveClass("custom-modal");
  });
});
