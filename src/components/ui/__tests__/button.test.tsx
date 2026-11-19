import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../button";

describe("shared button interaction contract", () => {
  it("defaults to a non-submitting action inside a form", async () => {
    const onSubmit = vi.fn();
    const onClick = vi.fn();
    render(<form onSubmit={(event) => { event.preventDefault(); onSubmit(); }}><Button onClick={onClick}>Apply code</Button></form>);
    await userEvent.click(screen.getByRole("button", { name: "Apply code" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("preserves explicit native form submission", async () => {
    const onSubmit = vi.fn();
    render(<form onSubmit={(event) => { event.preventDefault(); onSubmit(); }}><Button type="submit">Save changes</Button></form>);
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("keeps its accessible action name while blocking duplicate actions during loading", async () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button loading onClick={onClick}>Save changes</Button>);
    const action = screen.getByRole("button", { name: "Save changes" });
    expect(action).toBeDisabled();
    expect(action).toHaveAttribute("aria-busy", "true");
    await userEvent.click(action);
    expect(onClick).not.toHaveBeenCalled();
    rerender(<Button onClick={onClick}>Save changes</Button>);
    expect(action).toBeEnabled();
    expect(action).not.toHaveAttribute("aria-busy");
    await userEvent.click(action);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("retains an explicitly disabled action after loading completes", () => {
    const { rerender } = render(<Button loading disabled>Approve seller</Button>);
    rerender(<Button disabled>Approve seller</Button>);
    expect(screen.getByRole("button", { name: "Approve seller" })).toBeDisabled();
  });

  it("exposes the native button ref for keyboard focus restoration", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref} aria-label="Open menu">Menu</Button>);
    ref.current?.focus();
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus();
  });
});
