import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/features/auth/auth-store";
import { getMyPermissions } from "@/features/rbac/api";

import {
  createSupportTicket,
  getSupportAgents,
  getSupportSummary,
  getSupportTags,
  getSupportTicket,
  getSupportTickets,
} from "../api";
import { SupportCenter } from "../components/support-center";
import { SUPPORT_PERMISSIONS } from "../permissions";
import type { SupportTicket } from "../types";

vi.mock("@/features/rbac/api", () => ({
  getMyPermissions: vi.fn(),
}));

vi.mock("../api", () => ({
  addSupportTicketTag: vi.fn(),
  assignSupportTicket: vi.fn(),
  changeSupportTicketPriority: vi.fn(),
  closeSupportTicket: vi.fn(),
  createSupportTag: vi.fn(),
  createSupportTicket: vi.fn(),
  deleteSupportTag: vi.fn(),
  getSupportAgents: vi.fn(),
  getSupportAuditLogs: vi.fn(),
  getSupportSummary: vi.fn(),
  getSupportTags: vi.fn(),
  getSupportTicket: vi.fn(),
  getSupportTickets: vi.fn(),
  removeSupportTicketTag: vi.fn(),
  reopenSupportTicket: vi.fn(),
  replyToSupportTicket: vi.fn(),
  resolveSupportTicket: vi.fn(),
  updateSupportTag: vi.fn(),
  uploadSupportAttachment: vi.fn(),
}));

const mockedGetMyPermissions = vi.mocked(getMyPermissions);
const mockedGetSupportTickets = vi.mocked(getSupportTickets);
const mockedGetSupportSummary = vi.mocked(getSupportSummary);
const mockedGetSupportTags = vi.mocked(getSupportTags);
const mockedGetSupportAgents = vi.mocked(getSupportAgents);
const mockedGetSupportTicket = vi.mocked(getSupportTicket);
const mockedCreateSupportTicket = vi.mocked(createSupportTicket);

function makeTicket(overrides: Partial<SupportTicket> = {}): SupportTicket {
  return {
    id: 1,
    ticket_number: "SUP-20261017-ABC12345",
    customer: 1,
    customer_display: "Sina",
    assigned_to: null,
    assigned_to_display: null,
    subject: "Payment issue",
    category: "payment",
    priority: "normal",
    status: "open",
    order: null,
    product: null,
    return_request: null,
    last_message_at: "2026-10-17T15:00:00Z",
    resolved_at: null,
    closed_at: null,
    messages: [
      {
        id: 1,
        ticket: 1,
        sender: 1,
        sender_display: "Sina",
        message: "Please help",
        is_internal_note: false,
        created_at: "2026-10-17T15:00:00Z",
        updated_at: "2026-10-17T15:00:00Z",
      },
    ],
    created_at: "2026-10-17T15:00:00Z",
    updated_at: "2026-10-17T15:00:00Z",
    tags: [],
    tags_detail: [],
    attachments: [],
    ...overrides,
  };
}

const summary = {
  status: {
    total: 1,
    open: 1,
    pending: 0,
    resolved: 0,
    closed: 0,
  },
  priority: {
    low: 0,
    normal: 1,
    high: 0,
    urgent: 0,
  },
  category: {
    order: 0,
    payment: 1,
    shipping: 0,
    return_ticket: 0,
    product: 0,
    account: 0,
    other: 0,
  },
  assigned_to_me: 0,
  unassigned: 1,
};

describe("SupportCenter", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAuthStore.setState({
      user: {
        id: 1,
        email: "sina@example.com",
        phone: null,
        full_name: "Sina",
        is_seller: false,
        is_staff: false,
        is_superuser: false,
        email_verified: true,
      },
      isAuthenticated: true,
      isLoading: false,
      isBootstrapped: true,
    });

    const ticket = makeTicket();

    mockedGetSupportTickets.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [ticket],
    });
    mockedGetSupportSummary.mockResolvedValue(summary);
    mockedGetSupportTags.mockResolvedValue([]);
    mockedGetSupportAgents.mockResolvedValue([]);
    mockedGetSupportTicket.mockResolvedValue(ticket);
  });

  it("renders the customer support experience", async () => {
    mockedGetMyPermissions.mockResolvedValue({
      user_id: 1,
      email: "sina@example.com",
      permissions: [],
      permissions_count: 0,
    });

    render(<SupportCenter />);

    expect(
      await screen.findByRole("heading", {
        name: "Customer support",
      }),
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "New ticket" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Filter priority")).not.toBeInTheDocument();
    expect(mockedGetSupportAgents).not.toHaveBeenCalled();
  });

  it("creates a customer ticket", async () => {
    const user = userEvent.setup();

    mockedGetMyPermissions.mockResolvedValue({
      user_id: 1,
      email: "sina@example.com",
      permissions: [],
      permissions_count: 0,
    });

    const created = makeTicket({
      id: 2,
      subject: "New issue",
    });

    mockedCreateSupportTicket.mockResolvedValue(created);
    mockedGetSupportTicket.mockResolvedValue(created);

    render(<SupportCenter />);

    await user.click(await screen.findByRole("button", { name: "New ticket" }));

    await user.type(screen.getByLabelText("Ticket subject"), "New issue");
    await user.type(
      screen.getByLabelText("Initial message"),
      "Something went wrong.",
    );

    await user.click(screen.getByRole("button", { name: "Create ticket" }));

    await waitFor(() => {
      expect(mockedCreateSupportTicket).toHaveBeenCalledWith({
        subject: "New issue",
        category: "other",
        initial_message: "Something went wrong.",
      });
    });
  });

  it("opens a notification deep-linked ticket", async () => {
    mockedGetMyPermissions.mockResolvedValue({
      user_id: 1,
      email: "sina@example.com",
      permissions: [],
      permissions_count: 0,
    });

    render(<SupportCenter initialTicketId={1} />);

    await waitFor(() => {
      expect(mockedGetSupportTicket).toHaveBeenCalledWith(1);
    });

    expect(await screen.findByText("Conversation")).toBeInTheDocument();
  });

  it("renders agent controls without manager-only actions", async () => {
    mockedGetMyPermissions.mockResolvedValue({
      user_id: 1,
      email: "agent@example.com",
      permissions: [
        SUPPORT_PERMISSIONS.viewAllTickets,
        SUPPORT_PERMISSIONS.reply,
        SUPPORT_PERMISSIONS.viewInternalNotes,
        SUPPORT_PERMISSIONS.addInternalNote,
        SUPPORT_PERMISSIONS.resolve,
      ],
      permissions_count: 5,
    });

    render(<SupportCenter />);

    expect(
      await screen.findByRole("heading", {
        name: "Support desk",
      }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText("Filter priority")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New ticket" })).not.toBeInTheDocument();
    expect(mockedGetSupportAgents).not.toHaveBeenCalled();

    const ticketButton = await screen.findByRole(
  "button",
  {
    name: /Payment issue/i,
  },
);

await userEvent.click(ticketButton);

    expect(await screen.findByText("Conversation")).toBeInTheDocument();
    expect(screen.queryByLabelText("Assign ticket")).not.toBeInTheDocument();
  });

  it("loads assignable agents for support managers", async () => {
    mockedGetMyPermissions.mockResolvedValue({
      user_id: 1,
      email: "manager@example.com",
      permissions: Object.values(SUPPORT_PERMISSIONS),
      permissions_count: Object.values(SUPPORT_PERMISSIONS).length,
    });

    mockedGetSupportAgents.mockResolvedValue([
      {
        id: 8,
        email: "agent@example.com",
        full_name: "Support Agent",
      },
    ]);

    render(<SupportCenter />);

    await screen.findByRole("heading", {
      name: "Support desk",
    });

    await waitFor(() => {
      expect(mockedGetSupportAgents).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: /Payment issue/i }));

    expect(await screen.findByLabelText("Assign ticket")).toBeInTheDocument();
    expect(
      screen.getByRole("option", {
        name: "Support Agent",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Tag management")).toBeInTheDocument();
  });
});
