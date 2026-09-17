import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  cancelShipment,
  getShipment,
  markShipmentDelivered,
  markShipmentReady,
  markShipmentShipped,
  type ShipmentDetail,
} from "@/features/shipments/api";
import { AdminShipmentDetail } from "../admin-shipment-detail";

const paramsMock = vi.hoisted(() => ({ id: "2" }));

vi.mock("next/navigation", () => ({
  useParams: () => paramsMock,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/shipments/api", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/shipments/api")
  >("@/features/shipments/api");

  return {
    ...actual,
    getShipment: vi.fn(),
    markShipmentReady: vi.fn(),
    markShipmentShipped: vi.fn(),
    markShipmentDelivered: vi.fn(),
    cancelShipment: vi.fn(),
  };
});

const mockedGetShipment = vi.mocked(getShipment);
const mockedMarkShipmentReady = vi.mocked(markShipmentReady);
const mockedMarkShipmentShipped = vi.mocked(markShipmentShipped);
const mockedMarkShipmentDelivered = vi.mocked(markShipmentDelivered);
const mockedCancelShipment = vi.mocked(cancelShipment);

function makeShipment(overrides: Partial<ShipmentDetail> = {}): ShipmentDetail {
  return {
    id: 2,
    shipment_number: "SHP-20260917-447F30",
    order: 9,
    order_number: "ORD-20260916-7F55D1",
    user: 1,
    user_email: "customer@example.com",
    user_full_name: "Test Customer",
    carrier: "post",
    carrier_display: "Post",
    status: "pending",
    status_display: "Pending",
    tracking_number: "",
    tracking_url: "",
    shipping_cost: "0",
    receiver_name: "Sina",
    receiver_phone: "09147845365",
    province: "Bavaria",
    city: "Bamberg",
    address: "Main street 1",
    postal_code: "96047",
    notes: "",
    shipped_at: null,
    delivered_at: null,
    cancelled_at: null,
    created_by: 1,
    created_at: "2026-09-17T19:26:04Z",
    updated_at: "2026-09-17T19:26:04Z",
    events: [
      {
        id: 1,
        old_status: null,
        new_status: "pending",
        message: "Shipment created from paid order.",
        data: {},
        created_by: 1,
        created_by_name: "Admin User",
        created_at: "2026-09-17T19:26:04Z",
      },
    ],
    ...overrides,
  };
}

describe("AdminShipmentDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paramsMock.id = "2";
  });

  it("renders pending shipment details, events, and available actions", async () => {
    mockedGetShipment.mockResolvedValue(makeShipment());

    render(<AdminShipmentDetail />);

    expect(
      await screen.findByRole("heading", { name: "SHP-20260917-447F30" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/ORD-20260916-7F55D1/)).toBeInTheDocument();
    expect(
      screen.getByText("Shipment created from paid order."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Pending").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("09147845365")).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Mark ready" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Mark shipped" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancel shipment" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Mark delivered" }),
    ).not.toBeInTheDocument();
  });

  it("marks a pending shipment as ready", async () => {
    const user = userEvent.setup();
    const readyShipment = makeShipment({
      status: "ready_to_ship",
      status_display: "Ready to ship",
      events: [
        {
          id: 2,
          old_status: "pending",
          new_status: "ready_to_ship",
          message: "Package prepared",
          data: {},
          created_by: 1,
          created_by_name: "Admin User",
          created_at: "2026-09-17T19:30:00Z",
        },
      ],
    });

    mockedGetShipment.mockResolvedValue(makeShipment());
    mockedMarkShipmentReady.mockResolvedValue(readyShipment);

    render(<AdminShipmentDetail />);

    await screen.findByText("SHP-20260917-447F30");
    await user.type(screen.getByLabelText("Note"), "Package prepared");
    await user.click(screen.getByRole("button", { name: "Mark ready" }));

    await waitFor(() => {
      expect(mockedMarkShipmentReady).toHaveBeenCalledWith(2, {
        note: "Package prepared",
      });
    });

    expect(
      await screen.findByText("Shipment marked as ready."),
    ).toBeInTheDocument();
    expect(screen.getByText("Ready to ship")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Mark ready" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Mark shipped" }),
    ).toBeInTheDocument();
  });

  it("marks a shipment as shipped with tracking data", async () => {
    const user = userEvent.setup();
    const shippedShipment = makeShipment({
      status: "shipped",
      status_display: "Shipped",
      tracking_number: "TPX-123456",
      tracking_url: "https://tracking.example.com/TPX-123456",
      shipped_at: "2026-09-17T19:26:46Z",
      events: [
        {
          id: 2,
          old_status: "pending",
          new_status: "shipped",
          message: "Package prepared",
          data: {},
          created_by: 1,
          created_by_name: "Admin User",
          created_at: "2026-09-17T19:26:46Z",
        },
      ],
    });

    mockedGetShipment.mockResolvedValue(makeShipment());
    mockedMarkShipmentShipped.mockResolvedValue(shippedShipment);

    render(<AdminShipmentDetail />);

    await screen.findByText("SHP-20260917-447F30");

    await user.type(screen.getByLabelText("Note"), "Package prepared");
    await user.type(screen.getByLabelText("Tracking number"), "TPX-123456");
    await user.type(
      screen.getByLabelText("Tracking URL"),
      "https://tracking.example.com/TPX-123456",
    );
    await user.click(screen.getByRole("button", { name: "Mark shipped" }));

    await waitFor(() => {
      expect(mockedMarkShipmentShipped).toHaveBeenCalledWith(2, {
        tracking_number: "TPX-123456",
        tracking_url: "https://tracking.example.com/TPX-123456",
        note: "Package prepared",
      });
    });

    expect(
      await screen.findByText("Shipment marked as shipped."),
    ).toBeInTheDocument();
    expect(screen.getByText("Pending → Shipped")).toBeInTheDocument();
    expect(screen.getByText("TPX-123456")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open tracking" })).toHaveAttribute(
      "href",
      "https://tracking.example.com/TPX-123456",
    );
    expect(
      screen.getByRole("button", { name: "Mark delivered" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Mark shipped" }),
    ).not.toBeInTheDocument();
  });

  it("marks a shipped shipment as delivered and removes all actions", async () => {
    const user = userEvent.setup();
    const shippedShipment = makeShipment({
      status: "shipped",
      status_display: "Shipped",
      tracking_number: "TPX-123456",
      tracking_url: "https://tracking.example.com/TPX-123456",
      shipped_at: "2026-09-17T19:26:46Z",
    });
    const deliveredShipment = makeShipment({
      status: "delivered",
      status_display: "Delivered",
      tracking_number: "TPX-123456",
      tracking_url: "https://tracking.example.com/TPX-123456",
      shipped_at: "2026-09-17T19:26:46Z",
      delivered_at: "2026-09-17T19:27:19Z",
      events: [
        {
          id: 3,
          old_status: "shipped",
          new_status: "delivered",
          message: "Shipment delivered.",
          data: {},
          created_by: 1,
          created_by_name: "Admin User",
          created_at: "2026-09-17T19:27:19Z",
        },
      ],
    });

    mockedGetShipment.mockResolvedValue(shippedShipment);
    mockedMarkShipmentDelivered.mockResolvedValue(deliveredShipment);

    render(<AdminShipmentDetail />);

    await screen.findByText("SHP-20260917-447F30");
    await user.type(screen.getByLabelText("Note"), "Delivered to customer");
    await user.click(screen.getByRole("button", { name: "Mark delivered" }));

    await waitFor(() => {
      expect(mockedMarkShipmentDelivered).toHaveBeenCalledWith(2, {
        note: "Delivered to customer",
      });
    });

    expect(
      await screen.findByText("Shipment marked as delivered."),
    ).toBeInTheDocument();
    expect(screen.getByText("Shipped → Delivered")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No shipment action is available for the current status.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /mark|cancel shipment/i }),
    ).not.toBeInTheDocument();
  });

  it("cancels a pending shipment", async () => {
    const user = userEvent.setup();
    const cancelledShipment = makeShipment({
      status: "cancelled",
      status_display: "Cancelled",
      cancelled_at: "2026-09-17T19:40:00Z",
    });

    mockedGetShipment.mockResolvedValue(makeShipment());
    mockedCancelShipment.mockResolvedValue(cancelledShipment);

    render(<AdminShipmentDetail />);

    await screen.findByText("SHP-20260917-447F30");
    await user.type(screen.getByLabelText("Note"), "Cancelled by admin");
    await user.click(screen.getByRole("button", { name: "Cancel shipment" }));

    await waitFor(() => {
      expect(mockedCancelShipment).toHaveBeenCalledWith(2, {
        note: "Cancelled by admin",
      });
    });

    expect(await screen.findByText("Shipment cancelled.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No shipment action is available for the current status.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a load error", async () => {
    mockedGetShipment.mockRejectedValue(new Error("Shipment was not found."));

    render(<AdminShipmentDetail />);

    expect(
      await screen.findByText("Shipment was not found."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to shipments/i }),
    ).toHaveAttribute("href", "/admin/shipments");
  });

  it("shows an action error without replacing the loaded shipment", async () => {
    const user = userEvent.setup();

    mockedGetShipment.mockResolvedValue(makeShipment());
    mockedMarkShipmentReady.mockRejectedValue(
      new Error("Shipment cannot be marked as ready."),
    );

    render(<AdminShipmentDetail />);

    await screen.findByText("SHP-20260917-447F30");
    await user.click(screen.getByRole("button", { name: "Mark ready" }));

    expect(
      await screen.findByText("Shipment cannot be marked as ready."),
    ).toBeInTheDocument();
    expect(screen.getByText("SHP-20260917-447F30")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Mark ready" }),
    ).toBeInTheDocument();
  });
});
