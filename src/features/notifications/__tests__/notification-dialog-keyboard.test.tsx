import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { NotificationConfirmDialog } from "../components/notification-confirm-dialog";

function Confirmation({ busy = false }: { busy?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open confirmation</button>
      <button>Background action</button>
      <NotificationConfirmDialog
        open={open}
        title="Delete selected?"
        description="This cannot be undone."
        confirmLabel="Delete"
        isBusy={busy}
        onCancel={() => setOpen(false)}
        onConfirm={vi.fn()}
      />
    </>
  );
}

describe("notification dialog keyboard access", () => {
  it("focuses Cancel, traps Tab in both directions, closes with Escape and restores its trigger", async () => {
    const user = userEvent.setup();
    render(<Confirmation />);
    const trigger = screen.getByRole("button", { name: "Open confirmation" });
    await user.click(trigger);
    const cancel = screen.getByRole("button", { name: "Cancel" });
    const confirm = screen.getByRole("button", { name: "Delete" });
    expect(cancel).toHaveFocus();
    await user.tab({ shift: true });
    expect(confirm).toHaveFocus();
    await user.tab();
    expect(cancel).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
  });

  it("keeps a busy confirmation open on Escape and backdrop interaction", async () => {
    const user = userEvent.setup();
    render(<Confirmation busy />);
    await user.click(screen.getByRole("button", { name: "Open confirmation" }));
    const dialog = screen.getByRole("dialog", { name: "Delete selected?" });
    await user.keyboard("{Escape}");
    await user.click(dialog.parentElement!);
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
