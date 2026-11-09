import "@testing-library/jest-dom/vitest";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
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
  replyToSupportTicket,
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
const mockedReplyToSupportTicket = vi.mocked(replyToSupportTicket);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function ticketPage(...tickets: SupportTicket[]) {
  return { count: tickets.length, next: null, previous: null, results: tickets };
}

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

    mockedGetMyPermissions.mockResolvedValue({
      user_id: 1,
      email: "sina@example.com",
      permissions: [],
      permissions_count: 0,
    });

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
    mockedReplyToSupportTicket.mockResolvedValue(ticket);
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

  it.each(["success", "failure"])("ignores a delayed first selection %s and replies to the latest conversation", async (outcome) => {
    const first = makeTicket({ id: 1, subject: "First conversation" });
    const second = makeTicket({ id: 2, subject: "Second conversation" });
    const oldDetail = deferred<SupportTicket>();
    mockedGetSupportTickets.mockResolvedValue(ticketPage(first, second));
    mockedGetSupportTicket.mockImplementation((id) => Number(id) === 1 ? oldDetail.promise : Promise.resolve(second));
    const user = userEvent.setup();
    render(<SupportCenter />);

    await user.click(await screen.findByRole("button", { name: /First conversation/ }));
    await user.click(screen.getByRole("button", { name: /Second conversation/ }));
    await screen.findByRole("heading", { name: "Second conversation" });
    await act(async () => {
      if (outcome === "success") oldDetail.resolve(first);
      else oldDetail.reject(new Error("Old detail failed"));
    });

    expect(screen.getByRole("heading", { name: "Second conversation" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "First conversation" })).not.toBeInTheDocument();
    expect(screen.queryByText("Old detail failed")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Ticket reply"), "Reply to the second ticket");
    await user.click(screen.getByRole("button", { name: "Send reply" }));
    expect(mockedReplyToSupportTicket).toHaveBeenCalledWith(2, "Reply to the second ticket", false);
    // Selection no longer refetches the whole workspace or duplicates detail calls.
    expect(mockedGetSupportTicket.mock.calls.filter(([id]) => Number(id) === 1)).toHaveLength(1);
  });

  it("removes the previous composer immediately while the newly selected ticket loads", async () => {
    const first = makeTicket({ id: 1, subject: "First conversation" });
    const second = makeTicket({ id: 2, subject: "Second conversation" });
    const nextDetail = deferred<SupportTicket>();
    mockedGetSupportTickets.mockResolvedValue(ticketPage(first, second));
    mockedGetSupportTicket.mockImplementation((id) => Number(id) === 1 ? Promise.resolve(first) : nextDetail.promise);
    const user = userEvent.setup();
    render(<SupportCenter />);
    await user.click(await screen.findByRole("button", { name: /First conversation/ }));
    await user.type(await screen.findByLabelText("Ticket reply"), "Draft for the first ticket");
    await user.click(screen.getByRole("button", { name: /Second conversation/ }));

    expect(screen.getByText("Loading conversation...")).toBeInTheDocument();
    expect(screen.queryByLabelText("Ticket reply")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "First conversation" })).not.toBeInTheDocument();
    await act(async () => { nextDetail.resolve(second); });
    expect(await screen.findByLabelText("Ticket reply")).toHaveValue("");
    expect(mockedReplyToSupportTicket).not.toHaveBeenCalled();
  });

  it("keeps the newest filter's list and summary when an older workspace finishes last", async () => {
    const first = makeTicket({ id: 1, subject: "Open result" });
    const second = makeTicket({ id: 2, subject: "Pending result", status: "pending" });
    const oldPage = deferred<ReturnType<typeof ticketPage>>();
    const newPage = deferred<ReturnType<typeof ticketPage>>();
    mockedGetSupportTickets.mockImplementation((filters) => {
      if (filters?.status === "open") return oldPage.promise;
      if (filters?.status === "pending") return newPage.promise;
      return Promise.resolve(ticketPage());
    });
    mockedGetSupportSummary.mockImplementation(async (filters) => ({
      ...summary,
      status: { ...summary.status, total: filters?.status === "open" ? 77 : 1 },
    }));
    render(<SupportCenter />);
    await screen.findByRole("heading", { name: "Customer support" });
    fireEvent.change(screen.getByLabelText("Filter status"), { target: { value: "open" } });
    await waitFor(() => expect(mockedGetSupportTickets).toHaveBeenCalledWith({ ordering: "-updated_at", status: "open" }, 1, 20));
    fireEvent.change(screen.getByLabelText("Filter status"), { target: { value: "pending" } });
    await act(async () => { newPage.resolve(ticketPage(second)); });
    await screen.findByRole("button", { name: /Pending result/ });
    await act(async () => { oldPage.resolve(ticketPage(first)); });

    expect(screen.getByRole("button", { name: /Pending result/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Open result/ })).not.toBeInTheDocument();
    expect(screen.getByText("Total").nextElementSibling).toHaveTextContent("1");
    expect(screen.queryByText("Refreshing...")).not.toBeInTheDocument();
  });

  it("does not let a completed reply reopen its old ticket or clear the latest ticket's draft", async () => {
    const first = makeTicket({ id: 1, subject: "First conversation" });
    const second = makeTicket({ id: 2, subject: "Second conversation" });
    const replyResponse = deferred<SupportTicket>();
    mockedGetSupportTickets.mockResolvedValue(ticketPage(first, second));
    mockedGetSupportTicket.mockImplementation(async (id) => Number(id) === 1 ? first : second);
    mockedReplyToSupportTicket.mockReturnValueOnce(replyResponse.promise);
    const user = userEvent.setup();
    render(<SupportCenter />);
    await user.click(await screen.findByRole("button", { name: /First conversation/ }));
    await user.type(await screen.findByLabelText("Ticket reply"), "First ticket reply");
    await user.click(screen.getByRole("button", { name: "Send reply" }));
    await user.click(screen.getByRole("button", { name: /Second conversation/ }));
    await user.type(await screen.findByLabelText("Ticket reply"), "Second ticket draft");
    fireEvent.change(screen.getByLabelText("Filter status"), { target: { value: "pending" } });
    await waitFor(() => expect(mockedGetSupportTickets).toHaveBeenLastCalledWith({ ordering: "-updated_at", status: "pending" }, 1, 20));
    await act(async () => { replyResponse.resolve(first); });

    expect(screen.getByRole("heading", { name: "Second conversation" })).toBeInTheDocument();
    expect(screen.getByLabelText("Ticket reply")).toHaveValue("Second ticket draft");
    expect(mockedGetSupportTickets).toHaveBeenLastCalledWith({ ordering: "-updated_at", status: "pending" }, 1, 20);
    expect(mockedGetSupportTicket.mock.calls.filter(([id]) => Number(id) === 1)).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Send reply" }));
    expect(mockedReplyToSupportTicket).toHaveBeenLastCalledWith(2, "Second ticket draft", false);
  });

  it("does not reopen a closed panel when its mutation-triggered detail refresh finishes", async () => {
    const ticket = makeTicket();
    const refreshDetail = deferred<SupportTicket>();
    mockedGetSupportTicket.mockResolvedValueOnce(ticket).mockReturnValueOnce(refreshDetail.promise);
    const user = userEvent.setup();
    render(<SupportCenter />);
    await user.click(await screen.findByRole("button", { name: /Payment issue/ }));
    await user.type(await screen.findByLabelText("Ticket reply"), "Reply before closing");
    await user.click(screen.getByRole("button", { name: "Send reply" }));
    await waitFor(() => expect(mockedGetSupportTicket).toHaveBeenCalledTimes(2));
    await user.click(screen.getByRole("button", { name: "Close panel" }));
    await act(async () => { refreshDetail.resolve(ticket); });

    expect(screen.getByText("Select a ticket")).toBeInTheDocument();
    expect(screen.queryByLabelText("Ticket reply")).not.toBeInTheDocument();
    expect(screen.queryByText("Conversation")).not.toBeInTheDocument();
  });

  it("keeps an explicit re-selection when a previously submitted new ticket finishes", async () => {
    const first = makeTicket({ id: 1, subject: "First conversation" });
    const second = makeTicket({ id: 2, subject: "Second conversation" });
    const created = makeTicket({ id: 3, subject: "Created conversation" });
    const creation = deferred<SupportTicket>();
    mockedGetSupportTickets.mockResolvedValue(ticketPage(first, second));
    mockedGetSupportTicket.mockImplementation(async (id) => Number(id) === 1 ? first : second);
    mockedCreateSupportTicket.mockReturnValueOnce(creation.promise);
    const user = userEvent.setup();
    render(<SupportCenter />);
    await user.click(await screen.findByRole("button", { name: /First conversation/ }));
    await screen.findByRole("heading", { name: "First conversation" });
    await user.click(screen.getByRole("button", { name: "New ticket" }));
    await user.type(screen.getByLabelText("Ticket subject"), "Created conversation");
    await user.type(screen.getByLabelText("Initial message"), "New conversation message");
    await user.click(screen.getByRole("button", { name: "Create ticket" }));
    await user.click(screen.getByRole("button", { name: /Second conversation/ }));
    await screen.findByRole("heading", { name: "Second conversation" });
    await user.click(screen.getByRole("button", { name: /First conversation/ }));
    await screen.findByRole("heading", { name: "First conversation" });
    await act(async () => { creation.resolve(created); });

    expect(screen.getByRole("heading", { name: "First conversation" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Created conversation" })).not.toBeInTheDocument();
  });

  it("opens a newly created conversation after StrictMode effect cleanup when selection is unchanged", async () => {
    const created = makeTicket({ id: 3, subject: "Created conversation" });
    mockedCreateSupportTicket.mockResolvedValueOnce(created);
    const user = userEvent.setup();
    render(<StrictMode><SupportCenter /></StrictMode>);
    await user.click(await screen.findByRole("button", { name: "New ticket" }));
    await user.type(screen.getByLabelText("Ticket subject"), "Created conversation");
    await user.type(screen.getByLabelText("Initial message"), "New conversation message");
    await user.click(screen.getByRole("button", { name: "Create ticket" }));

    expect(await screen.findByRole("heading", { name: "Created conversation" })).toBeInTheDocument();
    expect(screen.getByLabelText("Ticket reply")).toHaveValue("");
  });
});
