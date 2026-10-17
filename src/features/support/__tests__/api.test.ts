import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

import {
    addSupportTicketTag,
    assignSupportTicket,
    changeSupportTicketPriority,
    createSupportTicket,
    getSupportAgents,
    getSupportTags,
    getSupportTickets,
    replyToSupportTicket,
    resolveSupportTicket,
    uploadSupportAttachment,
} from "../api";

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);

describe("support api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gets a filtered paginated ticket page", async () => {
    mockedGet.mockResolvedValue({
      data: {
        count: 1,
        next: null,
        previous: null,
        results: [],
      },
    });

    await getSupportTickets(
      {
        status: "open",
        priority: "urgent",
        assigned_to: "me",
      },
      2,
      10,
    );

    expect(mockedGet).toHaveBeenCalledWith(API_ENDPOINTS.support.tickets, {
      params: {
        status: "open",
        priority: "urgent",
        assigned_to: "me",
        page: 2,
        page_size: 10,
      },
    });
  });

  it("normalizes plain ticket arrays", async () => {
    mockedGet.mockResolvedValue({
      data: [],
    });

    await expect(getSupportTickets({}, 1, 20)).resolves.toEqual({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
  });

  it("creates customer tickets without internal fields", async () => {
    mockedPost.mockResolvedValue({
      data: { id: 10 },
    });

    await createSupportTicket({
      subject: "Payment issue",
      category: "payment",
      initial_message: "Please help.",
    });

    expect(mockedPost).toHaveBeenCalledWith(API_ENDPOINTS.support.tickets, {
      subject: "Payment issue",
      category: "payment",
      initial_message: "Please help.",
    });
  });

  it("sends public and internal replies", async () => {
    mockedPost.mockResolvedValue({
      data: { id: 1 },
    });

    await replyToSupportTicket(5, "Customer reply");
    await replyToSupportTicket(5, "Staff note", true);

    expect(mockedPost).toHaveBeenNthCalledWith(
      1,
      API_ENDPOINTS.support.reply(5),
      {
        message: "Customer reply",
        is_internal_note: false,
      },
    );

    expect(mockedPost).toHaveBeenNthCalledWith(
      2,
      API_ENDPOINTS.support.reply(5),
      {
        message: "Staff note",
        is_internal_note: true,
      },
    );
  });

  it("assigns tickets and changes priority", async () => {
    mockedPost.mockResolvedValue({
      data: { id: 1 },
    });

    await assignSupportTicket(7, 42);
    await changeSupportTicketPriority(7, "urgent");

    expect(mockedPost).toHaveBeenNthCalledWith(
      1,
      API_ENDPOINTS.support.assign(7),
      {
        assigned_to: 42,
      },
    );

    expect(mockedPost).toHaveBeenNthCalledWith(
      2,
      API_ENDPOINTS.support.priority(7),
      {
        priority: "urgent",
      },
    );
  });

  it("adds ticket tags", async () => {
    mockedPost.mockResolvedValue({
      data: { id: 1 },
    });

    await addSupportTicketTag(7, 3);

    expect(mockedPost).toHaveBeenCalledWith(
      API_ENDPOINTS.support.addTag(7),
      {
        tag: 3,
      },
    );
  });

  it("loads tag and assignable-agent lists", async () => {
    mockedGet
      .mockResolvedValueOnce({
        data: {
          count: 1,
          next: null,
          previous: null,
          results: [{ id: 1, name: "Refund" }],
        },
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 4,
            email: "agent@example.com",
            full_name: "Agent",
          },
        ],
      });

    await expect(getSupportTags()).resolves.toEqual([
      {
        id: 1,
        name: "Refund",
      },
    ]);

    await expect(getSupportAgents()).resolves.toEqual([
      {
        id: 4,
        email: "agent@example.com",
        full_name: "Agent",
      },
    ]);
  });

  it("uploads attachments as multipart form data", async () => {
    mockedPost.mockResolvedValue({
      data: {
        id: 99,
      },
    });

    const file = new File(["hello"], "proof.txt", {
      type: "text/plain",
    });

    await uploadSupportAttachment(3, file);

    const [, body, config] = mockedPost.mock.calls[0];

    expect(mockedPost).toHaveBeenCalledWith(
      API_ENDPOINTS.support.attachments(3),
      expect.any(FormData),
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    expect((body as FormData).get("file")).toBe(file);
    expect(config).toEqual({
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  });

  it("resolves tickets with an empty action payload", async () => {
    mockedPost.mockResolvedValue({
      data: { id: 1, status: "resolved" },
    });

    await resolveSupportTicket(8);

    expect(mockedPost).toHaveBeenCalledWith(
      API_ENDPOINTS.support.resolve(8),
      {},
    );
  });
});
