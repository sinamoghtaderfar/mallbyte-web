import { StrictMode, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AccessibleDialog } from "../accessible-dialog";

function Dialog({
  onClose,
  children,
  title = "Settings",
}: {
  onClose: () => void;
  children?: React.ReactNode;
  title?: string;
}) {
  return (
    <AccessibleDialog
      onClose={onClose}
      labelledBy={title}
      overlayClassName="overlay"
      className="panel"
    >
      <h2 id={title}>{title}</h2>
      {children}
    </AccessibleDialog>
  );
}

function Example() {
  const [open, setOpen] = useState(false);
  const [nested, setNested] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open settings</button>
      <button>Background action</button>
      {open && (
        <Dialog onClose={() => setOpen(false)}>
          <input aria-label="Setting value" />
          <button disabled>Unavailable</button>
          <button hidden>Hidden action</button>
          <button onClick={() => setNested(true)}>Open details</button>
          <button onClick={() => setOpen(false)}>Close settings</button>
          {nested && (
            <Dialog title="Details" onClose={() => setNested(false)}>
              <button onClick={() => setNested(false)}>Close details</button>
            </Dialog>
          )}
        </Dialog>
      )}
    </>
  );
}

function Completion({
  removeTrigger,
  disableRemaining = false,
}: {
  removeTrigger: boolean;
  disableRemaining?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [complete, setComplete] = useState(false);
  return (
    <main aria-label="Notification actions">
      {!(complete && removeTrigger) && (
        <button disabled={complete} onClick={() => setOpen(true)}>
          Delete selected
        </button>
      )}
      <button disabled={complete && disableRemaining}>Refresh notifications</button>
      {open && (
        <Dialog onClose={() => setOpen(false)}>
          <button onClick={() => { setComplete(true); setOpen(false); }}>
            Confirm deletion
          </button>
        </Dialog>
      )}
    </main>
  );
}

describe("AccessibleDialog", () => {
  it.each([true, false])("restores logical focus after completion leaves its opener removed=%s", async (removeTrigger) => {
    const user = userEvent.setup();
    render(<Completion removeTrigger={removeTrigger} />);
    await user.click(screen.getByRole("button", { name: "Delete selected" }));
    await user.click(screen.getByRole("button", { name: "Confirm deletion" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh notifications" })).toHaveFocus();
  });

  it("focuses the logical container when all page actions become disabled on completion", async () => {
    const user = userEvent.setup();
    render(<Completion removeTrigger={false} disableRemaining />);
    await user.click(screen.getByRole("button", { name: "Delete selected" }));
    await user.click(screen.getByRole("button", { name: "Confirm deletion" }));
    const main = screen.getByRole("main", { name: "Notification actions" });
    expect(main).toHaveFocus();
    expect(main).not.toHaveAttribute("tabindex");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each([true, false])("keeps completion focus in its workspace before outer navigation when opener removed=%s", async (removeTrigger) => {
    const user = userEvent.setup();
    render(
      <>
        <nav aria-label="Site navigation"><button>Other workspace</button></nav>
        <Completion removeTrigger={removeTrigger} disableRemaining />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Delete selected" }));
    await user.click(screen.getByRole("button", { name: "Confirm deletion" }));
    const workspace = screen.getByRole("main", { name: "Notification actions" });
    expect(workspace).toHaveFocus();
    expect(workspace).not.toHaveAttribute("tabindex");
    expect(screen.getByRole("button", { name: "Other workspace" })).not.toHaveFocus();
  });

  it("restores focus and page interaction after StrictMode effect replay", async () => {
    const user = userEvent.setup();
    const view = render(
      <StrictMode>
        <Example />
      </StrictMode>,
    );
    const trigger = screen.getByRole("button", { name: "Open settings" });
    await user.click(trigger);
    expect(
      screen.getByRole("textbox", { name: "Setting value" }),
    ).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
    expect(view.container).not.toHaveAttribute("inert");
    expect(view.container).not.toHaveAttribute("aria-hidden");
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("retains the original opener across StrictMode replay instead of choosing the first background action", async () => {
    const user = userEvent.setup();
    render(
      <StrictMode>
        <button>Earlier background action</button>
        <Example />
      </StrictMode>,
    );
    const trigger = screen.getByRole("button", { name: "Open settings" });
    await user.click(trigger);
    expect(screen.getByRole("textbox", { name: "Setting value" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
    expect(screen.getByRole("button", { name: "Earlier background action" })).not.toHaveFocus();
  });

  it("makes the page inert, contains programmatic focus and restores focus/background on closing", async () => {
    const user = userEvent.setup();
    const view = render(<Example />);
    const trigger = screen.getByRole("button", { name: "Open settings" });
    const behind = screen.getByRole("button", { name: "Background action" });
    await user.click(trigger);
    const field = screen.getByRole("textbox", { name: "Setting value" });
    expect(field).toHaveFocus();
    expect(view.container).toHaveAttribute("inert");
    expect(view.container).toHaveAttribute("aria-hidden", "true");
    behind.focus();
    expect(field).toHaveFocus();
    await user.tab({ shift: true });
    expect(
      screen.getByRole("button", { name: "Close settings" }),
    ).toHaveFocus();
    await user.tab();
    expect(field).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
    expect(view.container).not.toHaveAttribute("inert");
    expect(view.container).not.toHaveAttribute("aria-hidden");
  });

  it("limits Escape to the top dialog and returns focus to its parent dialog", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Open settings" });
    await user.click(trigger);
    const nestedTrigger = screen.getByRole("button", { name: "Open details" });
    await user.click(nestedTrigger);
    expect(screen.getByRole("button", { name: "Close details" })).toHaveFocus();
    expect(
      screen.queryByRole("dialog", { name: "Settings" }),
    ).not.toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("dialog", { name: "Details" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Settings" }),
    ).toBeInTheDocument();
    expect(nestedTrigger).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
  });

  it("keeps focus on an empty dialog and restores existing page attributes/styles on unmount", () => {
    const existing = document.createElement("div");
    existing.setAttribute("inert", "");
    existing.setAttribute("aria-hidden", "false");
    document.body.append(existing);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "auto";
    const view = render(<Dialog onClose={() => {}} />);
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    expect(dialog).toHaveFocus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(dialog).toHaveFocus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(dialog).toHaveFocus();
    view.unmount();
    expect(existing).toHaveAttribute("inert");
    expect(existing).toHaveAttribute("aria-hidden", "false");
    expect(document.body.style.overflow).toBe("auto");
    document.body.style.overflow = originalOverflow;
    existing.remove();
  });
});
