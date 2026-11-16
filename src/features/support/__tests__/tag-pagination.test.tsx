import MockAdapter from "axios-mock-adapter";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/features/auth/auth-store";
import { getMyPermissions } from "@/features/rbac/api";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { clearSession } from "@/lib/auth/session-storage";

import { SupportCenter } from "../components/support-center";
import { getSupportTagsPage } from "../api";
import type { SupportTag, SupportTicket } from "../types";

vi.mock("@/features/rbac/api", () => ({ getMyPermissions: vi.fn() }));

const endpoints = API_ENDPOINTS.support;
const manager = {
  id: 1,
  email: "manager@example.test",
  full_name: "Manager",
  phone: null,
  is_staff: true,
  is_superuser: true,
  is_seller: false,
  email_verified: true,
};

function tag(id: number): SupportTag {
  return {
    id,
    name: `Tag ${String(id).padStart(2, "0")}`,
    slug: `tag-${id}`,
    color: "#64748b",
    is_active: true,
    created_at: "2026-11-10T12:00:00Z",
    updated_at: "2026-11-10T12:00:00Z",
  };
}

function tagPage(tags: SupportTag[], page: number) {
  return {
    count: tags.length,
    next: tags.length > page * 20 ? `${endpoints.tags}?page=${page + 1}` : null,
    previous: page > 1 ? `${endpoints.tags}?page=${page - 1}` : null,
    results: tags.slice((page - 1) * 20, page * 20),
  };
}

const ticket: SupportTicket = {
  id: 1,
  ticket_number: "SUP-001",
  customer: 1,
  customer_display: "Manager",
  assigned_to: null,
  assigned_to_display: null,
  subject: "Tag pagination ticket",
  category: "other",
  priority: "normal",
  status: "open",
  order: null,
  product: null,
  return_request: null,
  last_message_at: null,
  resolved_at: null,
  closed_at: null,
  messages: [],
  tags: [],
  tags_detail: [],
  attachments: [],
  created_at: "2026-11-10T12:00:00Z",
  updated_at: "2026-11-10T12:00:00Z",
};

const summary = {
  status: { total: 1, open: 1, pending: 0, resolved: 0, closed: 0 },
  priority: { low: 0, normal: 1, high: 0, urgent: 0 },
  category: {
    order: 0,
    payment: 0,
    shipping: 0,
    return_ticket: 0,
    product: 0,
    account: 0,
    other: 1,
  },
  assigned_to_me: 0,
  unassigned: 1,
};

describe("support tag pagination with backend response envelopes", () => {
  let mock: MockAdapter;
  let tags: SupportTag[];

  beforeEach(() => {
    clearSession();
    tags = Array.from({ length: 21 }, (_, index) => tag(index + 1));
    useAuthStore.setState({
      user: manager,
      isAuthenticated: true,
      isLoading: false,
      isBootstrapped: true,
    });
    vi.mocked(getMyPermissions).mockResolvedValue({
      user_id: 1,
      email: manager.email,
      permissions: [],
      permissions_count: 0,
    });
    mock = new MockAdapter(apiClient);
    mock
      .onGet(endpoints.tickets)
      .reply(200, { count: 1, next: null, previous: null, results: [ticket] });
    mock.onGet(endpoints.summary).reply(200, summary);
    mock.onGet(endpoints.agents).reply(200, []);
    mock.onGet(endpoints.ticketDetail(1)).reply(200, ticket);
    mock
      .onGet(endpoints.tags)
      .reply((config) => [200, tagPage(tags, Number(config.params.page ?? 1))]);
  });

  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it("preserves the server envelope and abort signal for a bounded later tag page", async () => {
    const controller = new AbortController();
    await expect(getSupportTagsPage(2, controller.signal)).resolves.toEqual(
      tagPage(tags, 2),
    );
    expect(mock.history.get[0].params).toEqual({ page: 2, page_size: 20 });
    expect(mock.history.get[0].signal).toBe(controller.signal);
  });

  it("retains the legacy array response fallback with a route back from later pages", async () => {
    mock.onGet(endpoints.tags).reply(200, [tag(21)]);
    await expect(getSupportTagsPage(2)).resolves.toEqual({
      count: 1,
      next: null,
      previous: "previous",
      results: [tag(21)],
    });
  });

  it("reaches tag21 in management and the ticket selector using bounded pages", async () => {
    const user = userEvent.setup();
    const updated = { ...ticket, tags: [21], tags_detail: [tag(21)] };
    mock.onPost(endpoints.addTag(1)).reply(() => {
      mock.onGet(endpoints.ticketDetail(1)).reply(200, updated);
      return [200, updated];
    });
    render(<SupportCenter initialTicketId={1} />);
    await screen.findByText("21 support tags");
    const select = screen.getByRole("combobox", { name: "Add ticket tag" });
    await user.selectOptions(select, "1");
    await user.click(screen.getByRole("button", { name: "Next tag page" }));
    await screen.findByRole("option", { name: "Tag 21" });
    expect(select).toHaveValue("");
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    await user.selectOptions(select, "21");
    await user.click(
      within(select.parentElement!.parentElement!).getByRole("button", {
        name: "Add tag",
      }),
    );
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ tag: 21 });
    await waitFor(() =>
      expect(screen.queryByRole("option", { name: "Tag 21" })).not.toBeInTheDocument(),
    );
    const requests = mock.history.get.filter(
      (request) => request.url === endpoints.tags,
    );
    expect(requests.map((request) => request.params)).toEqual([
      { page: 1, page_size: 20 },
      { page: 2, page_size: 20 },
    ]);
    expect(
      within(screen.getByRole("region", { name: "Tag management" })).getByText(
        "Tag 21",
      ),
    ).toBeInTheDocument();
  });

  it("keeps the ticket workspace available when initial optional tag loading fails", async () => {
    let first = true;
    mock.onGet(endpoints.tags).reply(() => {
      if (first) {
        first = false;
        return [503, { detail: "Tags unavailable" }];
      }
      return [200, tagPage(tags, 1)];
    });
    render(<SupportCenter initialTicketId={1} />);
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: /Tag pagination ticket/ })).toBeInTheDocument();
    expect(screen.getByText("Conversation")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry support tags" }));
    await screen.findByText("21 support tags");
    expect(screen.getByRole("combobox", { name: "Add ticket tag" })).toBeEnabled();
    expect(mock.history.get.filter((request) => request.url === endpoints.tags).map((request) => request.params.page)).toEqual([1, 1]);
    expect(mock.history.get.filter((request) => request.url === endpoints.tickets)).toHaveLength(1);
  });

  it("retries the failed tag page without failing or refetching the ticket workspace", async () => {
    let fail = true;
    mock.onGet(endpoints.tags).reply((config) => {
      const page = Number(config.params.page);
      if (page === 2 && fail) {
        fail = false;
        return [503, { detail: "Tag page unavailable" }];
      }
      return [200, tagPage(tags, page)];
    });
    render(<SupportCenter initialTicketId={1} />);
    await screen.findByText("21 support tags");
    fireEvent.click(screen.getByRole("button", { name: "Next tag page" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent(/503|Tag page unavailable/);
    expect(
      screen.getByRole("combobox", { name: "Add ticket tag" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Tag pagination ticket/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("21 support tags")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry support tags" }));
    await screen.findByRole("option", { name: "Tag 21" });
    expect(
      mock.history.get
        .filter((request) => request.url === endpoints.tags)
        .map((request) => request.params.page),
    ).toEqual([1, 2, 2]);
    expect(
      mock.history.get.filter((request) => request.url === endpoints.tickets),
    ).toHaveLength(1);
  });

  it.each(["success", "failure"])(
    "retires a pending later-page %s after navigating back",
    async (outcome) => {
      let finish!: (response: [number, unknown]) => void;
      const slow = new Promise<[number, unknown]>((resolve) => {
        finish = resolve;
      });
      mock
        .onGet(endpoints.tags)
        .reply((config) =>
          Number(config.params.page) === 2 ? slow : [200, tagPage(tags, 1)],
        );
      render(<SupportCenter initialTicketId={1} />);
      await screen.findByText("21 support tags");
      fireEvent.click(screen.getByRole("button", { name: "Next tag page" }));
      await waitFor(() =>
        expect(
          mock.history.get.filter((request) => request.url === endpoints.tags),
        ).toHaveLength(2),
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Previous tag page" }),
      );
      await screen.findByRole("option", { name: "Tag 01" });
      await act(async () => {
        finish(
          outcome === "success"
            ? [200, tagPage(tags, 2)]
            : [503, { detail: "Obsolete tag failure" }],
        );
        await slow;
      });
      expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
      expect(
        screen.queryByRole("option", { name: "Tag 21" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("alert"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("Loading support tags..."),
      ).not.toBeInTheDocument();
    },
  );

  it("reloads page one in server alphabetical order after creating a tag", async () => {
    mock.onPost(endpoints.tags).reply((config) => {
      tags.unshift({ ...tag(22), name: "A first tag" });
      expect(JSON.parse(config.data).name).toBe("A first tag");
      return [201, tags[0]];
    });
    const user = userEvent.setup();
    render(<SupportCenter />);
    await screen.findByText("21 support tags");
    await user.click(screen.getByRole("button", { name: "Next tag page" }));
    const management = screen.getByRole("region", { name: "Tag management" });
    await within(management).findByText("Tag 21");
    await user.type(
      within(management).getByRole("textbox", { name: "New tag name" }),
      "A first tag",
    );
    await user.click(
      within(management).getByRole("button", { name: "Add tag" }),
    );
    await screen.findByText("22 support tags");
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(within(management).getByText("A first tag")).toBeInTheDocument();
    expect(
      mock.history.get
        .filter((request) => request.url === endpoints.tags)
        .map((request) => request.params.page),
    ).toEqual([1, 2, 1]);
  });

  it("keeps the current page and server active state after updating a tag", async () => {
    mock.onPatch(endpoints.tagDetail(21)).reply((config) => {
      expect(JSON.parse(config.data)).toEqual({ is_active: false });
      tags[20] = { ...tags[20], is_active: false };
      return [200, tags[20]];
    });
    render(<SupportCenter initialTicketId={1} />);
    await screen.findByText("21 support tags");
    fireEvent.click(screen.getByRole("button", { name: "Next tag page" }));
    const management = screen.getByRole("region", { name: "Tag management" });
    await within(management).findByText("Tag 21");
    fireEvent.click(
      within(management).getByRole("button", { name: "Disable" }),
    );
    await within(management).findByText("inactive");
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Tag 21" }),
    ).not.toBeInTheDocument();
    expect(
      mock.history.get
        .filter((request) => request.url === endpoints.tags)
        .map((request) => request.params.page),
    ).toEqual([1, 2, 2]);
  });

  it("returns to the previous page after deleting its final later-page tag", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mock.onDelete(endpoints.tagDetail(21)).reply(() => {
      tags.pop();
      return [204];
    });
    render(<SupportCenter />);
    await screen.findByText("21 support tags");
    fireEvent.click(screen.getByRole("button", { name: "Next tag page" }));
    const management = screen.getByRole("region", { name: "Tag management" });
    await within(management).findByText("Tag 21");
    fireEvent.click(within(management).getByRole("button", { name: "Delete" }));
    await screen.findByText("20 support tags");
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Next tag page" }),
    ).toBeDisabled();
    expect(
      mock.history.get
        .filter((request) => request.url === endpoints.tags)
        .map((request) => request.params.page),
    ).toEqual([1, 2, 1]);
  });

  it("rejects old-session tag results after the account changes", async () => {
    let finish!: (response: [number, unknown]) => void;
    const slow = new Promise<[number, unknown]>((resolve) => {
      finish = resolve;
    });
    mock.onGet(endpoints.tags).reply((config) => {
      if (useAuthStore.getState().user?.id === 2)
        return [200, tagPage([{ ...tag(101), name: "New account tag" }], 1)];
      return Number(config.params.page) === 2 ? slow : [200, tagPage(tags, 1)];
    });
    render(<SupportCenter />);
    await screen.findByText("21 support tags");
    fireEvent.click(screen.getByRole("button", { name: "Next tag page" }));
    await waitFor(() =>
      expect(
        mock.history.get.filter((request) => request.url === endpoints.tags),
      ).toHaveLength(2),
    );
    act(() => {
      clearSession();
      useAuthStore.setState({ user: { ...manager, id: 2 } });
    });
    await screen.findByText("New account tag");
    await act(async () => {
      finish([200, tagPage(tags, 2)]);
      await slow;
    });
    expect(screen.getByText("1 support tags")).toBeInTheDocument();
    expect(screen.queryByText("Tag 21")).not.toBeInTheDocument();
  });
});
