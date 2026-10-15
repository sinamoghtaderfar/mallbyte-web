import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    getNotificationPreferences,
    updateNotificationPreferences,
} from "@/features/notifications/api";
import type { NotificationPreferences } from "@/features/notifications/types";

import { NotificationPreferencesCard } from "../components/notification-preferences";

vi.mock("@/features/notifications/api", () => ({
  getNotificationPreferences: vi.fn(),
  updateNotificationPreferences: vi.fn(),
}));

const mockedGetPreferences = vi.mocked(
  getNotificationPreferences,
);

const mockedUpdatePreferences = vi.mocked(
  updateNotificationPreferences,
);

function makePreferences(
  overrides: Partial<NotificationPreferences> = {},
): NotificationPreferences {
  return {
    id: 1,
    user: "sina@example.com",
    muted_notification_types: [],
    muted_channels: [],
    email_enabled: true,
    sms_enabled: true,
    push_enabled: true,
    in_app_enabled: true,
    created_at: "2026-10-15T12:00:00Z",
    updated_at: "2026-10-15T12:00:00Z",
    ...overrides,
  };
}

describe("NotificationPreferencesCard", () => {
  beforeEach(() => {
    mockedGetPreferences.mockResolvedValue(
      makePreferences(),
    );

    mockedUpdatePreferences.mockImplementation(
      async (payload) => ({
        ...makePreferences(),
        ...payload,
      }),
    );
  });

  it("loads and renders current notification preferences", async () => {
    render(<NotificationPreferencesCard />);

    expect(
      screen.getByText(
        "Loading notification preferences...",
      ),
    ).toBeInTheDocument();

    expect(
      await screen.findByRole("heading", {
        name: "Notification preferences",
      }),
    ).toBeInTheDocument();

    expect(mockedGetPreferences).toHaveBeenCalledTimes(1);

    expect(
      screen.getByRole("switch", {
        name: "In-app notifications",
      }),
    ).toHaveAttribute("aria-checked", "true");

    expect(
      screen.getByRole("switch", {
        name: "Email notifications",
      }),
    ).toHaveAttribute("aria-checked", "true");

    expect(
      screen.getByRole("switch", {
        name: "SMS notifications",
      }),
    ).toHaveAttribute("aria-checked", "true");

    expect(
      screen.getByRole("switch", {
        name: "Push notifications",
      }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("renders disabled channels from saved preferences", async () => {
    mockedGetPreferences.mockResolvedValueOnce(
      makePreferences({
        email_enabled: false,
        sms_enabled: false,
      }),
    );

    render(<NotificationPreferencesCard />);

    await screen.findByRole("heading", {
      name: "Notification preferences",
    });

    expect(
      screen.getByRole("switch", {
        name: "Email notifications",
      }),
    ).toHaveAttribute("aria-checked", "false");

    expect(
      screen.getByRole("switch", {
        name: "SMS notifications",
      }),
    ).toHaveAttribute("aria-checked", "false");

    expect(
      screen.getByRole("switch", {
        name: "Push notifications",
      }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("renders muted channels as disabled", async () => {
    mockedGetPreferences.mockResolvedValueOnce(
      makePreferences({
        muted_channels: ["sms"],
      }),
    );

    render(<NotificationPreferencesCard />);

    await screen.findByRole("heading", {
      name: "Notification preferences",
    });

    expect(
      screen.getByRole("switch", {
        name: "SMS notifications",
      }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("saves changed channel preferences", async () => {
    const user = userEvent.setup();

    render(<NotificationPreferencesCard />);

    const emailSwitch =
      await screen.findByRole("switch", {
        name: "Email notifications",
      });

    const pushSwitch = screen.getByRole("switch", {
      name: "Push notifications",
    });

    await user.click(emailSwitch);
    await user.click(pushSwitch);

    expect(emailSwitch).toHaveAttribute(
      "aria-checked",
      "false",
    );

    expect(pushSwitch).toHaveAttribute(
      "aria-checked",
      "false",
    );

    await user.click(
      screen.getByRole("button", {
        name: "Save preferences",
      }),
    );

    await waitFor(() => {
      expect(
        mockedUpdatePreferences,
      ).toHaveBeenCalledTimes(1);
    });

    expect(
      mockedUpdatePreferences,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        email_enabled: false,
        push_enabled: false,
        muted_channels: expect.arrayContaining([
          "email",
          "push",
        ]),
      }),
    );
  });

  it("mutes notification types and saves them", async () => {
    const user = userEvent.setup();

    render(<NotificationPreferencesCard />);

    await screen.findByRole("heading", {
      name: "Notification preferences",
    });

    const ordersButton = screen.getByRole("button", {
      name: /Orders/i,
    });

    const shippingButton = screen.getByRole(
      "button",
      {
        name: /Shipping/i,
      },
    );

    expect(ordersButton).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await user.click(ordersButton);
    await user.click(shippingButton);

    expect(ordersButton).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    expect(shippingButton).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(
      screen.getByRole("button", {
        name: "Save preferences",
      }),
    );

    await waitFor(() => {
      expect(
        mockedUpdatePreferences,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          muted_notification_types:
            expect.arrayContaining([
              "order",
              "shipping",
            ]),
        }),
      );
    });
  });

  it("renders previously muted notification types", async () => {
    mockedGetPreferences.mockResolvedValueOnce(
      makePreferences({
        muted_notification_types: [
          "payment",
          "return",
        ],
      }),
    );

    render(<NotificationPreferencesCard />);

    await screen.findByRole("heading", {
      name: "Notification preferences",
    });

    expect(
      screen.getByRole("button", {
        name: /Payments/i,
      }),
    ).toHaveAttribute("aria-pressed", "true");

    expect(
      screen.getByRole("button", {
        name: /Returns/i,
      }),
    ).toHaveAttribute("aria-pressed", "true");

    expect(
      screen.getByRole("button", {
        name: /Orders/i,
      }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("can unmute a previously muted notification type", async () => {
    const user = userEvent.setup();

    mockedGetPreferences.mockResolvedValueOnce(
      makePreferences({
        muted_notification_types: ["order"],
      }),
    );

    render(<NotificationPreferencesCard />);

    const ordersButton =
      await screen.findByRole("button", {
        name: /Orders/i,
      });

    expect(ordersButton).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(ordersButton);

    expect(ordersButton).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await user.click(
      screen.getByRole("button", {
        name: "Save preferences",
      }),
    );

    await waitFor(() => {
      expect(
        mockedUpdatePreferences,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          muted_notification_types: [],
        }),
      );
    });
  });

  it("preserves existing muted channels when saving", async () => {
    const user = userEvent.setup();

    mockedGetPreferences.mockResolvedValueOnce(
      makePreferences({
        muted_channels: ["sms"],
      }),
    );

    render(<NotificationPreferencesCard />);

    await screen.findByRole("heading", {
      name: "Notification preferences",
    });

    await user.click(
      screen.getByRole("button", {
        name: "Save preferences",
      }),
    );

    await waitFor(() => {
      expect(
        mockedUpdatePreferences,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          muted_channels: ["sms"],
        }),
      );
    });
  });

  it("shows success message after saving", async () => {
    const user = userEvent.setup();

    render(<NotificationPreferencesCard />);

    await screen.findByRole("heading", {
      name: "Notification preferences",
    });

    await user.click(
      screen.getByRole("button", {
        name: "Save preferences",
      }),
    );

    expect(
      await screen.findByText(
        "Notification preferences saved.",
      ),
    ).toBeInTheDocument();
  });

  it("disables save button while saving", async () => {
    const user = userEvent.setup();

    let resolveUpdate:
      | ((value: NotificationPreferences) => void)
      | undefined;

    mockedUpdatePreferences.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        }),
    );

    render(<NotificationPreferencesCard />);

    await screen.findByRole("heading", {
      name: "Notification preferences",
    });

    const saveButton = screen.getByRole("button", {
      name: "Save preferences",
    });

    await user.click(saveButton);

    expect(
      screen.getByRole("button", {
        name: "Saving...",
      }),
    ).toBeDisabled();

    resolveUpdate?.(makePreferences());

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Save preferences",
        }),
      ).not.toBeDisabled();
    });
  });

  it("shows API error when preferences cannot be loaded", async () => {
    mockedGetPreferences.mockRejectedValueOnce(
      new Error("Request failed"),
    );

    render(<NotificationPreferencesCard />);

    expect(
      await screen.findByText(
        "Could not load notification preferences",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Request failed"),
    ).toBeInTheDocument();
  });

  it("shows API error when preferences cannot be saved", async () => {
    const user = userEvent.setup();

    mockedUpdatePreferences.mockRejectedValueOnce(
      new Error("Request failed"),
    );

    render(<NotificationPreferencesCard />);

    await screen.findByRole("heading", {
      name: "Notification preferences",
    });

    await user.click(
      screen.getByRole("button", {
        name: "Save preferences",
      }),
    );

    expect(
      await screen.findByText("Request failed"),
    ).toBeInTheDocument();
  });
});