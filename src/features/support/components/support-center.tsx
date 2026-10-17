"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuthStore } from "@/features/auth/auth-store";
import { AccessDenied } from "@/features/auth/components/access-denied";
import { getMyPermissions } from "@/features/rbac/api";
import { getApiErrorMessage } from "@/lib/api/errors";

import {
  addSupportTicketTag,
  assignSupportTicket,
  changeSupportTicketPriority,
  closeSupportTicket,
  createSupportTag,
  createSupportTicket,
  deleteSupportTag,
  getSupportAgents,
  getSupportAuditLogs,
  getSupportSummary,
  getSupportTags,
  getSupportTicket,
  getSupportTickets,
  removeSupportTicketTag,
  reopenSupportTicket,
  replyToSupportTicket,
  resolveSupportTicket,
  updateSupportTag,
  uploadSupportAttachment,
} from "../api";
import {
  SUPPORT_CATEGORY_OPTIONS,
  SUPPORT_PRIORITY_OPTIONS,
  SUPPORT_STATUS_OPTIONS,
  getCategoryLabel,
  getPriorityLabel,
  getStatusLabel,
} from "../constants";
import {
  getSupportCapabilities,
  type SupportCapabilities,
} from "../permissions";
import type {
  CreateSupportTicketPayload,
  SupportAgent,
  SupportSummary,
  SupportTag,
  SupportTicket,
  SupportTicketCategory,
  SupportTicketFilters,
  SupportTicketPriority,
  SupportTicketStatus,
  TicketAuditLog,
} from "../types";

const EMPTY_SUMMARY: SupportSummary = {
  status: {
    total: 0,
    open: 0,
    pending: 0,
    resolved: 0,
    closed: 0,
  },
  priority: {
    low: 0,
    normal: 0,
    high: 0,
    urgent: 0,
  },
  category: {
    order: 0,
    payment: 0,
    shipping: 0,
    return_ticket: 0,
    product: 0,
    account: 0,
    other: 0,
  },
  assigned_to_me: 0,
  unassigned: 0,
};

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function badgeClass(value: string) {
  const base = "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold";

  const classes: Record<string, string> = {
    open: "bg-blue-50 text-blue-700",
    pending: "bg-amber-50 text-amber-700",
    resolved: "bg-emerald-50 text-emerald-700",
    closed: "bg-slate-100 text-slate-600",
    low: "bg-slate-100 text-slate-600",
    normal: "bg-blue-50 text-blue-700",
    high: "bg-orange-50 text-orange-700",
    urgent: "bg-red-50 text-red-700",
  };

  return `${base} ${classes[value] ?? "bg-slate-100 text-slate-700"}`;
}

type CreateTicketFormProps = {
  onCreated: (ticket: SupportTicket) => void;
  onCancel: () => void;
};

function CreateTicketForm({
  onCreated,
  onCancel,
}: CreateTicketFormProps) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] =
    useState<SupportTicketCategory>("other");
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState("");
  const [productId, setProductId] = useState("");
  const [returnRequestId, setReturnRequestId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!subject.trim() || !message.trim()) {
      setError("Subject and message are required.");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload: CreateSupportTicketPayload = {
      subject: subject.trim(),
      category,
      initial_message: message.trim(),
    };

    if (orderId) {
      payload.order = Number(orderId);
    }

    if (productId) {
      payload.product = Number(productId);
    }

    if (returnRequestId) {
      payload.return_request = Number(returnRequestId);
    }

    try {
      const ticket = await createSupportTicket(payload);
      onCreated(ticket);
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">
            New support ticket
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Describe the issue clearly so support can help faster.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="md:col-span-2">
          <span className="text-sm font-medium text-slate-700">
            Subject
          </span>

          <input
            aria-label="Ticket subject"
            value={subject}
            onChange={(event) =>
              setSubject(event.target.value)
            }
            className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            placeholder="Example: Payment succeeded but order is missing"
          />
        </label>

        <label>
          <span className="text-sm font-medium text-slate-700">
            Category
          </span>

          <select
            aria-label="Ticket category"
            value={category}
            onChange={(event) =>
              setCategory(
                event.target.value as SupportTicketCategory,
              )
            }
            className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
          >
            {SUPPORT_CATEGORY_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-3 gap-2">
          <label>
            <span className="text-xs font-medium text-slate-600">
              Order ID
            </span>

            <input
              aria-label="Order ID"
              type="number"
              min="1"
              value={orderId}
              onChange={(event) =>
                setOrderId(event.target.value)
              }
              className="mt-1.5 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm"
            />
          </label>

          <label>
            <span className="text-xs font-medium text-slate-600">
              Product ID
            </span>

            <input
              aria-label="Product ID"
              type="number"
              min="1"
              value={productId}
              onChange={(event) =>
                setProductId(event.target.value)
              }
              className="mt-1.5 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm"
            />
          </label>

          <label>
            <span className="text-xs font-medium text-slate-600">
              Return ID
            </span>

            <input
              aria-label="Return request ID"
              type="number"
              min="1"
              value={returnRequestId}
              onChange={(event) =>
                setReturnRequestId(event.target.value)
              }
              className="mt-1.5 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm"
            />
          </label>
        </div>

        <label className="md:col-span-2">
          <span className="text-sm font-medium text-slate-700">
            Message
          </span>

          <textarea
            aria-label="Initial message"
            value={message}
            onChange={(event) =>
              setMessage(event.target.value)
            }
            rows={6}
            className="mt-1.5 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            placeholder="What happened, what did you expect, and what have you already tried?"
          />
        </label>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Creating..." : "Create ticket"}
        </button>
      </div>
    </form>
  );
}

type TagManagerProps = {
  tags: SupportTag[];
  onChanged: () => Promise<void>;
};

function TagManager({
  tags,
  onChanged,
}: TagManagerProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#64748b");
  const [busyId, setBusyId] =
    useState<number | "new" | null>(null);
  const [error, setError] = useState("");

  async function handleCreate(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!name.trim()) {
      return;
    }

    setBusyId("new");
    setError("");

    try {
      await createSupportTag({
        name: name.trim(),
        color,
      });

      setName("");
      await onChanged();
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(tag: SupportTag) {
    setBusyId(tag.id);
    setError("");

    try {
      await updateSupportTag(tag.id, {
        is_active: !tag.is_active,
      });

      await onChanged();
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError));
    } finally {
      setBusyId(null);
    }
  }

  async function removeTag(tag: SupportTag) {
    if (
      !window.confirm(
        `Delete support tag "${tag.name}"?`,
      )
    ) {
      return;
    }

    setBusyId(tag.id);
    setError("");

    try {
      await deleteSupportTag(tag.id);
      await onChanged();
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">
        Tag management
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Managers can maintain the shared support taxonomy here.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <form
        onSubmit={handleCreate}
        className="mt-4 flex flex-wrap gap-2"
      >
        <input
          aria-label="New tag name"
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          placeholder="New tag"
          className="min-w-48 flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm"
        />

        <input
          aria-label="New tag color"
          type="color"
          value={color}
          onChange={(event) =>
            setColor(event.target.value)
          }
          className="h-11 w-14 rounded-xl border border-slate-200 bg-white p-1"
        />

        <button
          type="submit"
          disabled={busyId === "new"}
          className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          Add tag
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor:
                  tag.color || "#64748b",
              }}
            />

            <span className="text-sm font-medium text-slate-700">
              {tag.name}
            </span>

            {!tag.is_active ? (
              <span className="text-xs text-slate-400">
                inactive
              </span>
            ) : null}

            <button
              type="button"
              disabled={busyId === tag.id}
              onClick={() =>
                void toggleActive(tag)
              }
              className="text-xs font-medium text-slate-500 hover:text-slate-950"
            >
              {tag.is_active ? "Disable" : "Enable"}
            </button>

            <button
              type="button"
              disabled={busyId === tag.id}
              onClick={() =>
                void removeTag(tag)
              }
              className="text-xs font-medium text-red-600 hover:text-red-800"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

type TicketDetailProps = {
  ticket: SupportTicket;
  currentUserId: number;
  capabilities: SupportCapabilities;
  tags: SupportTag[];
  agents: SupportAgent[];
  onChanged: (ticketId: number) => Promise<void>;
  onClose: () => void;
};

function TicketDetail({
  ticket,
  currentUserId,
  capabilities,
  tags,
  agents,
  onChanged,
  onClose,
}: TicketDetailProps) {
  const isCustomer =
    ticket.customer === currentUserId;

  const canPublicReply =
    isCustomer || capabilities.canReplyAsStaff;

  const canAccessAttachments =
    isCustomer || capabilities.isSupportStaff;

  const canUpload =
    ticket.status !== "closed" &&
    (isCustomer || capabilities.canReplyAsStaff);

  const canReopenTicket =
    capabilities.canReopen ||
    (
      capabilities.isSupportStaff &&
      capabilities.canReplyAsStaff &&
      ticket.assigned_to === currentUserId
    );

  const [reply, setReply] = useState("");
  const [internalNote, setInternalNote] =
    useState(false);

  const [assignee, setAssignee] = useState(
    ticket.assigned_to
      ? String(ticket.assigned_to)
      : "",
  );

  const [priority, setPriority] =
    useState<SupportTicketPriority>(
      ticket.priority,
    );

  const [tagId, setTagId] = useState("");
  const [file, setFile] =
    useState<File | null>(null);

  const [auditLogs, setAuditLogs] =
    useState<TicketAuditLog[] | null>(null);

  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function run(
    key: string,
    operation: () => Promise<unknown>,
    refresh = true,
  ) {
    setBusy(key);
    setError("");

    try {
      await operation();

      if (refresh) {
        await onChanged(ticket.id);
      }
    } catch (caughtError) {
      setError(
        getApiErrorMessage(caughtError),
      );
    } finally {
      setBusy("");
    }
  }

  async function submitReply(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!reply.trim()) {
      return;
    }

    if (
      internalNote &&
      !capabilities.canAddInternalNote
    ) {
      setError(
        "You do not have permission to add internal notes.",
      );
      return;
    }

    if (
      !internalNote &&
      !canPublicReply
    ) {
      setError(
        "You do not have permission to reply to this ticket.",
      );
      return;
    }

    await run(
      "reply",
      async () => {
        await replyToSupportTicket(
          ticket.id,
          reply.trim(),
          internalNote,
        );

        setReply("");
        setInternalNote(false);
      },
    );
  }

  const activeTags = tags.filter(
    (tag) => tag.is_active,
  );

  const assignedTagIds = new Set(
    ticket.tags,
  );

  const availableTags =
    activeTags.filter(
      (tag) =>
        !assignedTagIds.has(tag.id),
    );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {ticket.ticket_number}
            </p>

            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              {ticket.subject}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {getCategoryLabel(ticket.category)}
              {" · opened "}
              {formatDate(ticket.created_at)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Close panel
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className={badgeClass(
              ticket.status,
            )}
          >
            {getStatusLabel(ticket.status)}
          </span>

          <span
            className={badgeClass(
              ticket.priority,
            )}
          >
            {getPriorityLabel(
              ticket.priority,
            )}
          </span>

          {ticket.tags_detail.map(
            (tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      tag.color ||
                      "#64748b",
                  }}
                />

                {tag.name}
              </span>
            ),
          )}
        </div>

        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-400">
              Customer
            </dt>

            <dd className="mt-1 font-medium text-slate-800">
              {ticket.customer_display ||
                `#${ticket.customer}`}
            </dd>
          </div>

          <div>
            <dt className="text-slate-400">
              Assigned to
            </dt>

            <dd className="mt-1 font-medium text-slate-800">
              {ticket.assigned_to_display ||
                "Unassigned"}
            </dd>
          </div>

          <div>
            <dt className="text-slate-400">
              Last message
            </dt>

            <dd className="mt-1 font-medium text-slate-800">
              {formatDate(
                ticket.last_message_at,
              )}
            </dd>
          </div>
        </dl>
      </div>

      {error ? (
        <p
          role="alert"
          className="mx-6 mt-5 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      {capabilities.isSupportStaff ? (
        <div className="grid gap-4 border-b border-slate-200 p-6 md:grid-cols-2 xl:grid-cols-4">
          {capabilities.canAssign ? (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Assign ticket

                <select
                  aria-label="Assign ticket"
                  value={assignee}
                  onChange={(event) =>
                    setAssignee(
                      event.target.value,
                    )
                  }
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="">
                    Select agent
                  </option>

                  {agents.map((agent) => (
                    <option
                      key={agent.id}
                      value={agent.id}
                    >
                      {agent.full_name ||
                        agent.email}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                disabled={
                  !assignee ||
                  busy === "assign"
                }
                onClick={() =>
                  void run(
                    "assign",
                    () =>
                      assignSupportTicket(
                        ticket.id,
                        Number(assignee),
                      ),
                  )
                }
                className="mt-2 w-full rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Save assignee
              </button>
            </div>
          ) : null}

          {capabilities.canChangePriority ? (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Priority

                <select
                  aria-label="Ticket priority"
                  value={priority}
                  onChange={(event) =>
                    setPriority(
                      event.target
                        .value as SupportTicketPriority,
                    )
                  }
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                >
                  {SUPPORT_PRIORITY_OPTIONS.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <button
                type="button"
                disabled={
                  priority ===
                    ticket.priority ||
                  busy === "priority"
                }
                onClick={() =>
                  void run(
                    "priority",
                    () =>
                      changeSupportTicketPriority(
                        ticket.id,
                        priority,
                      ),
                  )
                }
                className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Update priority
              </button>
            </div>
          ) : null}

          {capabilities.canManageTags ? (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Add tag

                <select
                  aria-label="Add ticket tag"
                  value={tagId}
                  onChange={(event) =>
                    setTagId(
                      event.target.value,
                    )
                  }
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="">
                    Select tag
                  </option>

                  {availableTags.map(
                    (tag) => (
                      <option
                        key={tag.id}
                        value={tag.id}
                      >
                        {tag.name}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <button
                type="button"
                disabled={
                  !tagId ||
                  busy === "add-tag"
                }
                onClick={() =>
                  void run(
                    "add-tag",
                    async () => {
                      await addSupportTicketTag(
                        ticket.id,
                        Number(tagId),
                      );

                      setTagId("");
                    },
                  )
                }
                className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Add tag
              </button>
            </div>
          ) : null}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Lifecycle
            </p>

            <div className="mt-1.5 grid gap-2">
              {capabilities.canResolve &&
              ticket.status !== "resolved" &&
              ticket.status !== "closed" ? (
                <button
                  type="button"
                  disabled={
                    busy === "resolve"
                  }
                  onClick={() =>
                    void run(
                      "resolve",
                      () =>
                        resolveSupportTicket(
                          ticket.id,
                        ),
                    )
                  }
                  className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"
                >
                  Resolve
                </button>
              ) : null}

              {capabilities.canClose &&
              ticket.status !== "closed" ? (
                <button
                  type="button"
                  disabled={
                    busy === "close"
                  }
                  onClick={() =>
                    void run(
                      "close",
                      () =>
                        closeSupportTicket(
                          ticket.id,
                        ),
                    )
                  }
                  className="rounded-2xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  Close
                </button>
              ) : null}

              {canReopenTicket &&
              (
                ticket.status === "closed" ||
                ticket.status === "resolved"
              ) ? (
                <button
                  type="button"
                  disabled={
                    busy === "reopen"
                  }
                  onClick={() =>
                    void run(
                      "reopen",
                      () =>
                        reopenSupportTicket(
                          ticket.id,
                        ),
                    )
                  }
                  className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"
                >
                  Reopen
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {capabilities.canManageTags &&
      ticket.tags_detail.length ? (
        <div className="flex flex-wrap gap-2 border-b border-slate-200 px-6 py-4">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Remove tag
          </span>

          {ticket.tags_detail.map(
            (tag) => (
              <button
                key={tag.id}
                type="button"
                disabled={
                  busy ===
                  `remove-tag-${tag.id}`
                }
                onClick={() =>
                  void run(
                    `remove-tag-${tag.id}`,
                    () =>
                      removeSupportTicketTag(
                        ticket.id,
                        tag.id,
                      ),
                  )
                }
                className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-red-200 hover:text-red-700"
              >
                {tag.name} ×
              </button>
            ),
          )}
        </div>
      ) : null}

      <div className="p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Conversation
        </h3>

        <div className="mt-4 space-y-3">
          {ticket.messages.map(
            (message) => (
              <article
                key={message.id}
                className={[
                  "rounded-2xl border p-4",
                  message.is_internal_note
                    ? "border-amber-200 bg-amber-50"
                    : "border-slate-200 bg-slate-50",
                ].join(" ")}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">
                      {message.sender_display ||
                        `User #${message.sender}`}
                    </span>

                    {message.is_internal_note ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        Internal note
                      </span>
                    ) : null}
                  </div>

                  <time className="text-xs text-slate-400">
                    {formatDate(
                      message.created_at,
                    )}
                  </time>
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {message.message}
                </p>
              </article>
            ),
          )}

          {!ticket.messages.length ? (
            <p className="text-sm text-slate-500">
              No messages yet.
            </p>
          ) : null}
        </div>

        {ticket.status !== "closed" &&
        (
          canPublicReply ||
          capabilities.canAddInternalNote
        ) ? (
          <form
            onSubmit={submitReply}
            className="mt-6"
          >
            {capabilities.canAddInternalNote ? (
              <label className="mb-2 flex items-center gap-2 text-sm text-slate-600">
                <input
                  aria-label="Internal note"
                  type="checkbox"
                  checked={internalNote}
                  onChange={(event) =>
                    setInternalNote(
                      event.target.checked,
                    )
                  }
                />

                Internal note
              </label>
            ) : null}

            <textarea
              aria-label="Ticket reply"
              value={reply}
              onChange={(event) =>
                setReply(
                  event.target.value,
                )
              }
              rows={4}
              placeholder={
                internalNote
                  ? "Write an internal note..."
                  : "Write a reply..."
              }
              className="w-full resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
            />

            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={
                  !reply.trim() ||
                  busy === "reply"
                }
                className="rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {internalNote
                  ? "Add note"
                  : "Send reply"}
              </button>
            </div>
          </form>
        ) : ticket.status ===
          "closed" ? (
          <p className="mt-6 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
            This ticket is closed.
            Reopen it before adding new
            replies or attachments.
          </p>
        ) : null}

        {canAccessAttachments ? (
          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="text-sm font-semibold text-slate-700">
              Attachments
            </p>

            {canUpload ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  aria-label="Ticket attachment"
                  type="file"
                  onChange={(event) =>
                    setFile(
                      event.target.files?.[0] ??
                        null,
                    )
                  }
                  className="max-w-full text-sm text-slate-600"
                />

                <button
                  type="button"
                  disabled={
                    !file ||
                    busy === "attachment"
                  }
                  onClick={() =>
                    file
                      ? void run(
                          "attachment",
                          async () => {
                            await uploadSupportAttachment(
                              ticket.id,
                              file,
                            );

                            setFile(null);
                          },
                        )
                      : undefined
                  }
                  className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                >
                  Upload
                </button>
              </div>
            ) : ticket.status ===
              "closed" ? (
              <p className="mt-2 text-sm text-slate-500">
                New attachments cannot be
                uploaded while this ticket
                is closed.
              </p>
            ) : null}

            {ticket.attachments.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {ticket.attachments.map(
                  (attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.file}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-950"
                    >
                      {attachment.original_filename ||
                        `Attachment #${attachment.id}`}
                    </a>
                  ),
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-400">
                No attachments.
              </p>
            )}
          </div>
        ) : null}

        {capabilities.canViewAuditLogs ? (
          <div className="mt-6 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={() =>
                void run(
                  "audit",
                  async () => {
                    const logs =
                      await getSupportAuditLogs(
                        ticket.id,
                      );

                    setAuditLogs(logs);
                  },
                  false,
                )
              }
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              {auditLogs
                ? "Refresh audit log"
                : "Load audit log"}
            </button>

            {auditLogs ? (
              <div className="mt-3 space-y-2">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-slate-200 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-700">
                        {log.action}
                      </span>

                      <span className="text-xs text-slate-400">
                        {formatDate(
                          log.created_at,
                        )}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-600">
                      {log.description ||
                        "No description"}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

type SupportCenterProps = {
  initialTicketId?: number;
};

export function SupportCenter({
  initialTicketId,
}: SupportCenterProps) {
  const user = useAuthStore(
    (state) => state.user,
  );

  const authenticated = useAuthStore(
    (state) => state.isAuthenticated,
  );

  const bootstrapped = useAuthStore(
    (state) => state.isBootstrapped,
  );

  const authLoading = useAuthStore(
    (state) => state.isLoading,
  );

  const userId =
    user?.id ?? null;

  const handledInitialTicketIdRef =
    useRef<number | undefined>(
      undefined,
    );

  const [permissions, setPermissions] =
    useState<string[]>([]);

  const [
    permissionsForUserId,
    setPermissionsForUserId,
  ] = useState<number | null>(null);

  const [filters, setFilters] =
    useState<SupportTicketFilters>({
      ordering: "-updated_at",
    });

  const [page, setPage] =
    useState(1);

  const [ticketPage, setTicketPage] =
    useState<{
      count: number;
      next: string | null;
      previous: string | null;
      results: SupportTicket[];
    }>({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

  const [summary, setSummary] =
    useState<SupportSummary>(
      EMPTY_SUMMARY,
    );

  const [tags, setTags] =
    useState<SupportTag[]>([]);

  const [agents, setAgents] =
    useState<SupportAgent[]>([]);

  const [
    selectedTicket,
    setSelectedTicket,
  ] = useState<SupportTicket | null>(
    null,
  );

  const [showCreate, setShowCreate] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const permissionReady =
    !authenticated ||
    userId === null ||
    permissionsForUserId === userId;

  const capabilities = useMemo(
    () =>
      getSupportCapabilities(
        permissions,
        Boolean(
          user?.is_superuser,
        ),
      ),
    [
      permissions,
      user?.is_superuser,
    ],
  );

  useEffect(() => {
    if (
      !bootstrapped ||
      authLoading ||
      !authenticated ||
      userId === null
    ) {
      return;
    }

    let cancelled = false;

    void getMyPermissions()
      .then((data) => {
        if (cancelled) {
          return;
        }

        setPermissions(
          data.permissions,
        );

        setPermissionsForUserId(
          userId,
        );

        setError("");
      })
      .catch((caughtError) => {
        if (cancelled) {
          return;
        }

        setPermissions([]);

        setPermissionsForUserId(
          userId,
        );

        setError(
          getApiErrorMessage(
            caughtError,
          ),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [
    authenticated,
    authLoading,
    bootstrapped,
    userId,
  ]);

  const refreshTags =
    useCallback(async () => {
      const tagData =
        await getSupportTags();

      setTags(tagData);
    }, []);

  const refreshWorkspace =
    useCallback(
      async (
        selectedId?: number,
      ) => {
        setLoading(true);
        setError("");

        try {
          const [
            tickets,
            summaryData,
            tagData,
          ] = await Promise.all([
            getSupportTickets(
              filters,
              page,
              20,
            ),
            getSupportSummary(
              filters,
            ),
            getSupportTags(),
          ]);

          setTicketPage(tickets);
          setSummary(summaryData);
          setTags(tagData);

          if (
            capabilities.canAssign
          ) {
            const agentData =
              await getSupportAgents();

            setAgents(agentData);
          } else {
            setAgents([]);
          }

          if (selectedId) {
            setSelectedTicket(
              await getSupportTicket(
                selectedId,
              ),
            );
          }
        } catch (caughtError) {
          setError(
            getApiErrorMessage(
              caughtError,
            ),
          );
        } finally {
          setLoading(false);
        }
      },
      [
        capabilities.canAssign,
        filters,
        page,
      ],
    );

  useEffect(() => {
    if (
      !permissionReady ||
      !authenticated ||
      userId === null ||
      !bootstrapped ||
      authLoading
    ) {
      return;
    }

    const hasNewInitialTicket =
      initialTicketId != null &&
      handledInitialTicketIdRef.current !==
        initialTicketId;

    const ticketIdToOpen =
      hasNewInitialTicket
        ? initialTicketId
        : selectedTicket?.id;

    if (hasNewInitialTicket) {
      handledInitialTicketIdRef.current =
        initialTicketId;
    }

    void refreshWorkspace(
      ticketIdToOpen,
    );
  }, [
    authenticated,
    authLoading,
    bootstrapped,
    initialTicketId,
    permissionReady,
    refreshWorkspace,
    selectedTicket?.id,
    userId,
  ]);

  function updateFilter<
    Key extends keyof SupportTicketFilters,
  >(
    key: Key,
    value: SupportTicketFilters[Key],
  ) {
    setPage(1);

    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function openTicket(
    ticketId: number,
  ) {
    setError("");

    try {
      setSelectedTicket(
        await getSupportTicket(
          ticketId,
        ),
      );
    } catch (caughtError) {
      setError(
        getApiErrorMessage(
          caughtError,
        ),
      );
    }
  }

  async function handleCreated(
    ticket: SupportTicket,
  ) {
    setShowCreate(false);
    setSelectedTicket(ticket);

    await refreshWorkspace(
      ticket.id,
    );
  }

  if (
    !bootstrapped ||
    authLoading ||
    !permissionReady
  ) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10">
        <p className="text-sm text-slate-500">
          Loading support workspace...
        </p>
      </main>
    );
  }

  if (
    !authenticated ||
    !user
  ) {
    return (
      <AccessDenied
        title="Sign in required"
        description="Sign in to create and manage your support tickets."
      />
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {capabilities.isSupportStaff
              ? "Support operations"
              : "Help center"}
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            {capabilities.isSupportStaff
              ? "Support desk"
              : "Customer support"}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {capabilities.isSupportStaff
              ? "Work the support queue with actions controlled by your RBAC permissions."
              : "Create tickets, follow replies, and keep your support history in one place."}
          </p>
        </div>

        {!capabilities.isSupportStaff ? (
          <button
            type="button"
            onClick={() =>
              setShowCreate(
                (current) =>
                  !current,
              )
            }
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {showCreate
              ? "Hide form"
              : "New ticket"}
          </button>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      {showCreate &&
      !capabilities.isSupportStaff ? (
        <div className="mt-6">
          <CreateTicketForm
            onCreated={(ticket) =>
              void handleCreated(
                ticket,
              )
            }
            onCancel={() =>
              setShowCreate(false)
            }
          />
        </div>
      ) : null}

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [
            "Total",
            summary.status.total,
          ],
          [
            "Open",
            summary.status.open,
          ],
          [
            "Pending",
            summary.status.pending,
          ],
          [
            capabilities.isSupportStaff
              ? "Unassigned"
              : "Resolved",
            capabilities.isSupportStaff
              ? summary.unassigned
              : summary.status
                  .resolved,
          ],
        ].map(
          ([label, value]) => (
            <div
              key={String(label)}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-slate-500">
                {label}
              </p>

              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {value}
              </p>
            </div>
          ),
        )}
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <label>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </span>

            <select
              aria-label="Filter status"
              value={
                filters.status ?? ""
              }
              onChange={(event) =>
                updateFilter(
                  "status",
                  event.target
                    .value as
                    | SupportTicketStatus
                    | "",
                )
              }
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">
                All statuses
              </option>

              {SUPPORT_STATUS_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>
          </label>

          {capabilities.isSupportStaff ? (
            <>
              <label>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Priority
                </span>

                <select
                  aria-label="Filter priority"
                  value={
                    filters.priority ??
                    ""
                  }
                  onChange={(event) =>
                    updateFilter(
                      "priority",
                      event.target
                        .value as
                        | SupportTicketPriority
                        | "",
                    )
                  }
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="">
                    All priorities
                  </option>

                  {SUPPORT_PRIORITY_OPTIONS.map(
                    (option) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {
                          option.label
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Category
                </span>

                <select
                  aria-label="Filter category"
                  value={
                    filters.category ??
                    ""
                  }
                  onChange={(event) =>
                    updateFilter(
                      "category",
                      event.target
                        .value as
                        | SupportTicketCategory
                        | "",
                    )
                  }
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="">
                    All categories
                  </option>

                  {SUPPORT_CATEGORY_OPTIONS.map(
                    (option) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {
                          option.label
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Assignment
                </span>

                <select
                  aria-label="Filter assignment"
                  value={
                    filters.assigned_to ??
                    ""
                  }
                  onChange={(event) =>
                    updateFilter(
                      "assigned_to",
                      event.target
                        .value ===
                        "me"
                        ? "me"
                        : "",
                    )
                  }
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="">
                    All assignments
                  </option>

                  <option value="me">
                    Assigned to me
                  </option>
                </select>
              </label>
            </>
          ) : null}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-950">
                Tickets
              </h2>

              <p className="text-xs text-slate-500">
                {ticketPage.count}{" "}
                ticket
                {ticketPage.count === 1
                  ? ""
                  : "s"}
              </p>
            </div>

            {loading ? (
              <span className="text-xs text-slate-400">
                Refreshing...
              </span>
            ) : null}
          </div>

          <div className="divide-y divide-slate-100">
            {ticketPage.results.map(
              (ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() =>
                    void openTicket(
                      ticket.id,
                    )
                  }
                  className={[
                    "w-full px-5 py-4 text-left transition hover:bg-slate-50",
                    selectedTicket?.id ===
                    ticket.id
                      ? "bg-slate-50"
                      : "",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {
                          ticket.subject
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {
                          ticket.ticket_number
                        }
                        {" · "}
                        {getCategoryLabel(
                          ticket.category,
                        )}
                      </p>
                    </div>

                    <span
                      className={badgeClass(
                        ticket.status,
                      )}
                    >
                      {getStatusLabel(
                        ticket.status,
                      )}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={badgeClass(
                        ticket.priority,
                      )}
                    >
                      {getPriorityLabel(
                        ticket.priority,
                      )}
                    </span>

                    {capabilities.isSupportStaff ? (
                      <span className="text-xs text-slate-500">
                        {ticket.assigned_to_display ||
                          "Unassigned"}
                      </span>
                    ) : null}

                    <span className="ml-auto text-xs text-slate-400">
                      {formatDate(
                        ticket.updated_at,
                      )}
                    </span>
                  </div>
                </button>
              ),
            )}

            {!loading &&
            !ticketPage.results
              .length ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                No tickets match these
                filters.
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
            <button
              type="button"
              disabled={
                !ticketPage.previous ||
                page <= 1
              }
              onClick={() =>
                setPage(
                  (current) =>
                    Math.max(
                      1,
                      current - 1,
                    ),
                )
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-xs text-slate-400">
              Page {page}
            </span>

            <button
              type="button"
              disabled={
                !ticketPage.next
              }
              onClick={() =>
                setPage(
                  (current) =>
                    current + 1,
                )
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </section>

        {selectedTicket ? (
          <TicketDetail
            key={selectedTicket.id}
            ticket={selectedTicket}
            currentUserId={user.id}
            capabilities={
              capabilities
            }
            tags={tags}
            agents={agents}
            onChanged={async (
              ticketId,
            ) => {
              await refreshWorkspace(
                ticketId,
              );
            }}
            onClose={() =>
              setSelectedTicket(
                null,
              )
            }
          />
        ) : (
          <section className="flex min-h-80 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <div>
              <p className="font-semibold text-slate-800">
                Select a ticket
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Open a ticket to view
                the conversation and
                available actions.
              </p>
            </div>
          </section>
        )}
      </div>

      {capabilities.canManageTags ? (
        <div className="mt-6">
          <TagManager
            tags={tags}
            onChanged={
              refreshTags
            }
          />
        </div>
      ) : null}
    </main>
  );
}