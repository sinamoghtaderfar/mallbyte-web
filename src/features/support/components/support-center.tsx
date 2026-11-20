"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Inbox, MessageSquarePlus, MessagesSquare } from "lucide-react";

import { Button, buttonStyles } from "@/components/ui/button";
import { StatCard } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/states";
import { useAuthStore } from "@/features/auth/auth-store";
import { AccessDenied } from "@/features/auth/components/access-denied";
import { getMyPermissions } from "@/features/rbac/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getSessionGeneration, isCurrentSession } from "@/lib/auth/session-storage";
import type { PaginatedResponse } from "@/types/api";

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
  getSupportTagsPage,
  getSupportTicket,
  getSupportTickets,
  removeSupportTicketTag,
  reopenSupportTicket,
  replyToSupportTicket,
  resolveSupportTicket,
  updateSupportTag,
  uploadSupportAttachment,
  downloadSupportAttachment,
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
  const base = "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-5 ring-1 ring-inset";

  const classes: Record<string, string> = {
    open: "bg-sky-50 text-sky-900 ring-sky-200",
    pending: "bg-amber-50 text-amber-900 ring-amber-200",
    resolved: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    closed: "bg-slate-100 text-slate-700 ring-slate-200",
    low: "bg-slate-100 text-slate-700 ring-slate-200",
    normal: "bg-surface text-slate-700 ring-line-strong",
    high: "bg-ember-50 text-ember-800 ring-ember-200",
    urgent: "bg-rose-50 text-rose-800 ring-rose-200",
  };

  return `${base} ${classes[value] ?? "bg-slate-100 text-slate-700 ring-slate-200"}`;
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
      className="mb-card p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            New support ticket
          </h2>

          <p className="mt-1 text-sm text-muted">
            Describe the issue clearly so support can help faster.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="mb-btn mb-btn-secondary mb-btn-sm"
        >
          Cancel
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 text-sm text-danger"
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
            className="mt-1.5 w-full mb-control"
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
            className="mt-1.5 w-full mb-control mb-select"
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
              className="mt-1.5 mb-control"
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
              className="mt-1.5 mb-control"
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
              className="mt-1.5 mb-control"
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
            className="mt-1.5 w-full resize-y mb-control"
            placeholder="What happened, what did you expect, and what have you already tried?"
          />
        </label>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="mb-btn mb-btn-primary"
        >
          {submitting ? "Creating..." : "Create ticket"}
        </button>
      </div>
    </form>
  );
}

type TagChange = { page: number; created?: boolean; removedLast?: boolean };

type TagManagerProps = {
  tags: SupportTag[];
  page: number;
  onChanged: (change: TagChange) => Promise<void>;
};

function TagManager({
  tags,
  page,
  onChanged,
}: TagManagerProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6b675f");
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
      await onChanged({ page, created: true });
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

      await onChanged({ page });
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
      await onChanged({ page, removedLast: tags.length === 1 });
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section aria-labelledby="support-tag-management-heading" className="mb-card p-5 sm:p-6">
      <h2 id="support-tag-management-heading" className="text-lg font-semibold text-foreground">
        Tag management
      </h2>

      <p className="mt-1 text-sm text-muted">
        Managers can maintain the shared support taxonomy here. Showing the current support tag page.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-3 text-sm text-danger"
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
          className="mb-control min-w-48 flex-1"
        />

        <input
          aria-label="New tag color"
          type="color"
          value={color}
          onChange={(event) =>
            setColor(event.target.value)
          }
          className="h-11 w-14 rounded-xl border border-line-strong bg-surface p-1"
        />

        <button
          type="submit"
          disabled={busyId === "new"}
          className="mb-btn mb-btn-primary"
        >
          Add tag
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center gap-2 rounded-xl border border-line px-3 py-2"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor:
                  tag.color || "#6b675f",
              }}
            />

            <span className="text-sm font-medium text-slate-700">
              {tag.name}
            </span>

            {!tag.is_active ? (
              <span className="text-xs text-muted">
                inactive
              </span>
            ) : null}

            <button
              type="button"
              disabled={busyId === tag.id}
              onClick={() =>
                void toggleActive(tag)
              }
              className="text-xs font-medium text-muted hover:text-foreground"
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
  tagRequest: number;
  tagsReady: boolean;
  agents: SupportAgent[];
  onChanged: (ticketId: number) => Promise<void>;
  onClose: () => void;
};

function TicketDetail({
  ticket,
  currentUserId,
  capabilities,
  tags,
  tagRequest,
  tagsReady,
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

  const [tagSelection, setTagSelection] = useState({
    request: tagRequest,
    id: "",
  });
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
  const tagId =
    tagSelection.request === tagRequest &&
    availableTags.some((tag) => String(tag.id) === tagSelection.id)
      ? tagSelection.id
      : "";

  return (
    <section className="mb-card min-w-0 overflow-hidden">
      <div className="border-b border-line p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-eyebrow">
              {ticket.ticket_number}
            </p>

            <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {ticket.subject}
            </h2>

            <p className="mt-2 text-sm text-muted">
              {getCategoryLabel(ticket.category)}
              {" · opened "}
              {formatDate(ticket.created_at)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mb-btn mb-btn-secondary mb-btn-sm"
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
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-slate-700"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      tag.color ||
                      "#6b675f",
                  }}
                />

                {tag.name}
              </span>
            ),
          )}
        </div>

        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">
              Customer
            </dt>

            <dd className="mt-1 font-medium text-slate-800">
              {ticket.customer_display ||
                `#${ticket.customer}`}
            </dd>
          </div>

          <div>
            <dt className="text-muted">
              Assigned to
            </dt>

            <dd className="mt-1 font-medium text-slate-800">
              {ticket.assigned_to_display ||
                "Unassigned"}
            </dd>
          </div>

          <div>
            <dt className="text-muted">
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
          className="mx-6 mt-5 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      {capabilities.isSupportStaff ? (
        <div className="grid gap-4 border-b border-line p-6 md:grid-cols-2 xl:grid-cols-4">
          {capabilities.canAssign ? (
            <div>
              <label className="mb-eyebrow">
                Assign ticket

                <select
                  aria-label="Assign ticket"
                  value={assignee}
                  onChange={(event) =>
                    setAssignee(
                      event.target.value,
                    )
                  }
                  className="mt-1.5 mb-control mb-select"
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
                className="mt-2 w-full mb-btn mb-btn-primary mb-btn-sm"
              >
                Save assignee
              </button>
            </div>
          ) : null}

          {capabilities.canChangePriority ? (
            <div>
              <label className="mb-eyebrow">
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
                  className="mt-1.5 mb-control mb-select"
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
                className="mt-2 w-full mb-btn mb-btn-secondary mb-btn-sm"
              >
                Update priority
              </button>
            </div>
          ) : null}

          {capabilities.canManageTags ? (
            <div>
              <label className="mb-eyebrow">
                Add tag

                <select
                  aria-label="Add ticket tag"
                  value={tagId}
                  disabled={!tagsReady || busy === "add-tag"}
                  onChange={(event) =>
                    setTagSelection({ request: tagRequest, id: event.target.value })
                  }
                  className="mt-1.5 mb-control mb-select"
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
                  !tagsReady ||
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

                      setTagSelection({ request: tagRequest, id: "" });
                    },
                  )
                }
                className="mt-2 w-full mb-btn mb-btn-secondary mb-btn-sm"
              >
                Add tag
              </button>
            </div>
          ) : null}

          <div>
            <p className="mb-eyebrow">
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
                  className="mb-btn mb-btn-sm border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
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
                  className="mb-btn mb-btn-secondary mb-btn-sm"
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
                  className="mb-btn mb-btn-sm border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100"
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
        <div className="flex flex-wrap gap-2 border-b border-line px-6 py-4">
          <span className="mr-1 mb-eyebrow">
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
                className="inline-flex min-h-8 items-center rounded-full border border-line px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800"
              >
                {tag.name} ×
              </button>
            ),
          )}
        </div>
      ) : null}

      <div className="p-5 sm:p-6">
        <h3 className="mb-eyebrow">
          Conversation
        </h3>

        <ol className="mt-4 grid gap-3" aria-label="Messages">
          {ticket.messages.map(
            (message) => (
              <li key={message.id} className={message.sender === currentUserId ? "flex justify-end" : "flex justify-start"}>
              <article
                className={[
                  "w-full max-w-[44rem] rounded-2xl border p-4 sm:w-[88%]",
                  message.is_internal_note
                    ? "border-amber-200 bg-amber-50"
                    : message.sender === currentUserId
                      ? "rounded-br-md border-ink/10 bg-slate-100"
                      : "rounded-bl-md border-line bg-surface shadow-xs",
                ].join(" ")}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-[0.6875rem] font-semibold text-white">
                      {(message.sender_display || "U").trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {message.sender_display ||
                        `User #${message.sender}`}
                      {message.sender === currentUserId ? <span className="ml-1 font-normal text-muted">(you)</span> : null}
                    </span>

                    {message.is_internal_note ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        Internal note
                      </span>
                    ) : null}
                  </div>

                  <time dateTime={message.created_at} className="text-xs text-muted">
                    {formatDate(
                      message.created_at,
                    )}
                  </time>
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800 [overflow-wrap:anywhere]">
                  {message.message}
                </p>
              </article>
              </li>
            ),
          )}

          {!ticket.messages.length ? (
            <li className="text-sm text-muted">
              No messages yet.
            </li>
          ) : null}
        </ol>

        {ticket.status !== "closed" &&
        (
          canPublicReply ||
          capabilities.canAddInternalNote
        ) ? (
          <form
            onSubmit={submitReply}
            className={`mt-6 rounded-2xl border p-3 transition-colors focus-within:border-ink ${internalNote ? "border-amber-300 bg-amber-50/60" : "border-line-strong/80 bg-surface"}`}
          >
            {capabilities.canAddInternalNote ? (
              <label className="mb-2 flex min-h-9 items-center gap-2 px-1 text-sm text-slate-700">
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
              className="block w-full resize-y border-0 bg-transparent px-1 py-1 text-base text-foreground placeholder:text-muted focus:outline-none sm:text-sm"
            />

            <div className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-3">
              <p className="text-xs text-muted">{internalNote ? "Visible to support staff only." : "The customer is notified of replies."}</p>
              <button
                type="submit"
                disabled={
                  !reply.trim() ||
                  busy === "reply"
                }
                className="mb-btn mb-btn-primary"
              >
                {internalNote
                  ? "Add note"
                  : "Send reply"}
              </button>
            </div>
          </form>
        ) : ticket.status ===
          "closed" ? (
          <p className="mt-6 rounded-xl border border-line bg-sunken/60 p-4 text-sm text-muted">
            This ticket is closed.
            Reopen it before adding new
            replies or attachments.
          </p>
        ) : null}

        {canAccessAttachments ? (
          <div className="mt-6 border-t border-line pt-5">
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
                  className="mb-btn mb-btn-secondary mb-btn-sm"
                >
                  Upload
                </button>
              </div>
            ) : ticket.status ===
              "closed" ? (
              <p className="mt-2 text-sm text-muted">
                New attachments cannot be
                uploaded while this ticket
                is closed.
              </p>
            ) : null}

            {ticket.attachments.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {ticket.attachments.map(
                  (attachment) => (
                    <button
                      type="button"
                      key={attachment.id}
                      onClick={() => void run("download", () => downloadSupportAttachment(ticket.id, attachment.id, attachment.original_filename), false)}
                      className="mb-btn mb-btn-secondary mb-btn-sm text-xs font-medium text-slate-600 hover:text-foreground"
                    >
                      {attachment.original_filename ||
                        `Attachment #${attachment.id}`}
                    </button>
                  ),
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">
                No attachments.
              </p>
            )}
          </div>
        ) : null}

        {capabilities.canViewAuditLogs ? (
          <div className="mt-6 border-t border-line pt-5">
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
              className="mb-btn mb-btn-secondary mb-btn-sm"
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
                    className="rounded-xl border border-line px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-700">
                        {log.action}
                      </span>

                      <span className="text-xs text-muted">
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

  const workspaceRequestRef = useRef(0);
  const detailRequestRef = useRef(0);
  const tagsRequestRef = useRef(0);
  const tagsAbortRef = useRef<AbortController | null>(null);
  const tagsPageRef = useRef(1);
  const selectedTicketIdRef = useRef<number | null>(null);
  const selectionRevisionRef = useRef(0);
  const mountedRef = useRef(true);

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

  const [tagPage, setTagPage] = useState<{
    page: number;
    request: number;
    data: PaginatedResponse<SupportTag>;
    loading: boolean;
    error: string;
  }>({
    page: 1,
    request: 0,
    data: { count: 0, next: null, previous: null, results: [] },
    loading: false,
    error: "",
  });

  const [agents, setAgents] =
    useState<SupportAgent[]>([]);

  const [
    selectedTicket,
    setSelectedTicket,
  ] = useState<SupportTicket | null>(
    null,
  );

  const [selection, setSelection] = useState<{ id: number | null; revision: number }>({ id: null, revision: 0 });
  const selectedTicketId = selection.id;
  const [detailLoading, setDetailLoading] = useState(false);

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

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      workspaceRequestRef.current += 1;
      detailRequestRef.current += 1;
      tagsRequestRef.current += 1;
      tagsAbortRef.current?.abort();
      handledInitialTicketIdRef.current = undefined;
    };
  }, []);

  const refreshTags = useCallback(async (requestedPage = tagsPageRef.current) => {
    if (!mountedRef.current) return;
    const request = ++tagsRequestRef.current;
    tagsAbortRef.current?.abort();
    const controller = new AbortController();
    tagsAbortRef.current = controller;
    tagsPageRef.current = requestedPage;
    const session = getSessionGeneration();
    const isCurrent = () =>
      mountedRef.current &&
      request === tagsRequestRef.current &&
      isCurrentSession(session) &&
      useAuthStore.getState().isAuthenticated &&
      useAuthStore.getState().user?.id === userId;
    setTagPage((current) => ({
      ...current,
      page: requestedPage,
      request,
      loading: true,
      error: "",
      data: { ...current.data, results: [] },
    }));
    try {
      const data = await getSupportTagsPage(requestedPage, controller.signal);
      if (isCurrent()) {
        setTagPage({ page: requestedPage, request, data, loading: false, error: "" });
      }
    } catch (caughtError) {
      if (isCurrent()) {
        setTagPage((current) => ({
          ...current,
          loading: false,
          error: getApiErrorMessage(caughtError),
        }));
      }
    }
  }, [userId]);

  function handleTagsChanged(change: TagChange) {
    let nextPage = tagsPageRef.current;
    // A completed mutation refreshes the latest navigation target.
    if (change.page === nextPage) {
      if (change.created) nextPage = 1;
      else if (change.removedLast) nextPage = Math.max(1, nextPage - 1);
    }
    return refreshTags(nextPage);
  }

  useEffect(() => {
    if (
      !permissionReady || !authenticated || userId === null ||
      !bootstrapped || authLoading || !capabilities.canManageTags
    ) return;
    const generation = tagsRequestRef.current;
    void Promise.resolve().then(() => {
      if (generation === tagsRequestRef.current) return refreshTags(1);
    });
    return () => {
      tagsRequestRef.current += 1;
      tagsAbortRef.current?.abort();
    };
  }, [authenticated, authLoading, bootstrapped, capabilities.canManageTags, permissionReady, refreshTags, userId]);

  const refreshWorkspace = useCallback(async () => {
    if (!mountedRef.current) return;
    const request = ++workspaceRequestRef.current;
    const isCurrent = () => request === workspaceRequestRef.current &&
      useAuthStore.getState().isAuthenticated &&
      useAuthStore.getState().user?.id === userId;

    setLoading(true);
    setError("");

    try {
      const [tickets, summaryData] = await Promise.all([
        getSupportTickets(filters, page, 20),
        getSupportSummary(filters),
      ]);
      if (!isCurrent()) return;
      setTicketPage(tickets);
      setSummary(summaryData);
      if (capabilities.canAssign) {
        const agentData = await getSupportAgents();
        if (isCurrent()) setAgents(agentData);
      } else {
        setAgents([]);
      }
    } catch (caughtError) {
      if (isCurrent()) setError(getApiErrorMessage(caughtError));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [capabilities.canAssign, filters, page, userId]);

  // Mutation callbacks can outlive their detail panel. Always refresh the
  // current query, and never reopen a ticket after the user has moved on.
  const refreshWorkspaceRef = useRef(refreshWorkspace);
  useEffect(() => {
    refreshWorkspaceRef.current = refreshWorkspace;
  }, [refreshWorkspace]);

  const loadTicket = useCallback(async (ticketId: number, select: boolean) => {
    if (!mountedRef.current) return;
    if (select) {
      selectedTicketIdRef.current = ticketId;
      setSelection({ id: ticketId, revision: ++selectionRevisionRef.current });
      setSelectedTicket(null);
    } else if (selectedTicketIdRef.current !== ticketId) {
      return;
    }
    const request = ++detailRequestRef.current;
    const isCurrent = () => request === detailRequestRef.current &&
      selectedTicketIdRef.current === ticketId &&
      useAuthStore.getState().isAuthenticated &&
      useAuthStore.getState().user?.id === userId;

    setDetailLoading(true);
    setError("");
    try {
      const ticket = await getSupportTicket(ticketId);
      if (isCurrent()) setSelectedTicket(ticket);
    } catch (caughtError) {
      if (isCurrent()) setError(getApiErrorMessage(caughtError));
    } finally {
      if (isCurrent()) setDetailLoading(false);
    }
  }, [userId]);

  const closeTicket = useCallback(() => {
    detailRequestRef.current += 1;
    selectedTicketIdRef.current = null;
    setSelection({ id: null, revision: ++selectionRevisionRef.current });
    setSelectedTicket(null);
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    if (!permissionReady || !authenticated || userId === null ||
        !bootstrapped || authLoading) return;
    const generation = workspaceRequestRef.current;
    // Cleanup can retire a queued query before it starts (including StrictMode).
    void Promise.resolve().then(() => {
      if (generation === workspaceRequestRef.current) return refreshWorkspace();
    });
    return () => { workspaceRequestRef.current += 1; };
  }, [authenticated, authLoading, bootstrapped, permissionReady, refreshWorkspace, userId]);

  useEffect(() => {
    if (!permissionReady || !authenticated || userId === null ||
        !bootstrapped || authLoading || initialTicketId == null ||
        handledInitialTicketIdRef.current === initialTicketId) return;
    handledInitialTicketIdRef.current = initialTicketId;
    void loadTicket(initialTicketId, true);
  }, [authenticated, authLoading, bootstrapped, initialTicketId, loadTicket, permissionReady, userId]);

  function updateFilter<Key extends keyof SupportTicketFilters>(
    key: Key,
    value: SupportTicketFilters[Key],
  ) {
    // Retire the old query immediately, before the next effect starts.
    workspaceRequestRef.current += 1;
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function changePage(nextPage: number) {
    workspaceRequestRef.current += 1;
    setPage(nextPage);
  }

  async function handleChanged(ticketId: number) {
    await Promise.all([
      refreshWorkspaceRef.current(),
      loadTicket(ticketId, false),
    ]);
  }

  async function handleCreated(ticket: SupportTicket, previousSelection: number) {
    if (!mountedRef.current) return;
    setShowCreate(false);
    if (selectionRevisionRef.current === previousSelection) {
      detailRequestRef.current += 1;
      selectedTicketIdRef.current = ticket.id;
      setSelection({ id: ticket.id, revision: ++selectionRevisionRef.current });
      setSelectedTicket(ticket);
      setDetailLoading(false);
    }
    await refreshWorkspaceRef.current();
  }

  if (
    !bootstrapped ||
    authLoading ||
    !permissionReady
  ) {
    return (
      <main className="grid gap-6" aria-busy="true">
        <p role="status" className="text-sm text-muted">
          Loading support workspace...
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div>
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
    <main className="min-w-0">
      <PageHeader
        eyebrow={capabilities.isSupportStaff ? "Support operations" : "Help center"}
        title={capabilities.isSupportStaff ? "Support desk" : "Customer support"}
        description={capabilities.isSupportStaff
          ? "Work the support queue with actions controlled by your RBAC permissions."
          : "Create tickets, follow replies, and keep your support history in one place."}
        actions={!capabilities.isSupportStaff ? (
          <Button variant={showCreate ? "secondary" : "primary"} aria-expanded={showCreate}
            onClick={() => setShowCreate((current) => !current)}>
            {showCreate ? null : <MessageSquarePlus size={16} aria-hidden="true" />}
            {showCreate ? "Hide form" : "New ticket"}
          </Button>
        ) : null} />

      {error ? (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950"
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
                selection.revision,
              )
            }
            onCancel={() =>
              setShowCreate(false)
            }
          />
        </div>
      ) : null}

      <section aria-label="Ticket summary" className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
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
            <StatCard key={String(label)} label={label} value={value} />
          ),
        )}
      </section>

      <section aria-label="Ticket filters" className="mt-6 mb-card p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label>
            <span className="mb-eyebrow">
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
              className="mt-1.5 mb-control mb-select"
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
                <span className="mb-eyebrow">
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
                  className="mt-1.5 mb-control mb-select"
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
                <span className="mb-eyebrow">
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
                  className="mt-1.5 mb-control mb-select"
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
                <span className="mb-eyebrow">
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
                  className="mt-1.5 mb-control mb-select"
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

      {capabilities.canManageTags ? (
        <nav
          aria-label="Support tag pages"
          className="mt-6 mb-card p-5 text-sm text-slate-700"
        >
          <p className="font-semibold">{tagPage.data.count} support tags</p>
          <p className="mt-1 text-muted">
            This page supplies tag management and the ticket tag selector.
          </p>
          {tagPage.loading ? (
            <p role="status" className="mt-2">Loading support tags...</p>
          ) : null}
          {tagPage.error ? (
            <p role="alert" className="mt-2 text-danger">{tagPage.error}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={tagPage.page <= 1}
              onClick={() => void refreshTags(tagPage.page - 1)}
              className="mb-btn mb-btn-secondary mb-btn-sm"
            >
              Previous tag page
            </button>
            <span>
              Page {tagPage.page} of {Math.max(1, Math.ceil(tagPage.data.count / 20))}
            </span>
            <button
              type="button"
              disabled={tagPage.loading || Boolean(tagPage.error) || !tagPage.data.next}
              onClick={() => void refreshTags(tagPage.page + 1)}
              className="mb-btn mb-btn-secondary mb-btn-sm"
            >
              Next tag page
            </button>
            {tagPage.error ? (
              <button
                type="button"
                onClick={() => void refreshTags()}
                className="mb-btn mb-btn-secondary mb-btn-sm"
              >
                Retry support tags
              </button>
            ) : null}
          </div>
        </nav>
      ) : null}

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]">
        <section aria-label="Tickets" className="mb-card overflow-hidden xl:sticky xl:top-24">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Tickets
              </h2>

              <p className="text-xs text-muted">
                {ticketPage.count}{" "}
                ticket
                {ticketPage.count === 1
                  ? ""
                  : "s"}
              </p>
            </div>

            {loading ? (
              <span className="text-xs text-muted">
                Refreshing...
              </span>
            ) : null}
          </div>

          <div className="divide-y divide-line">
            {ticketPage.results.map(
              (ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() =>
                    void loadTicket(
                      ticket.id,
                      true,
                    )
                  }
                  aria-current={selectedTicketId === ticket.id ? "true" : undefined}
                  className={[
                    "relative w-full px-5 py-4 text-left transition-colors hover:bg-slate-50 focus-visible:z-10",
                    selectedTicketId ===
                    ticket.id
                      ? "bg-ember-50/60 before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-brand"
                      : "",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {
                          ticket.subject
                        }
                      </p>

                      <p className="mt-1 text-xs text-muted">
                        <span className="font-mono">{
                          ticket.ticket_number
                        }</span>
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
                      <span className="text-xs text-muted">
                        {ticket.assigned_to_display ||
                          "Unassigned"}
                      </span>
                    ) : null}

                    <span className="ml-auto text-xs text-muted">
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
              <div className="px-5 py-12 text-center">
                <Inbox size={22} className="mx-auto text-muted" aria-hidden="true" />
                <p className="mt-3 text-sm text-muted">No tickets match these
                filters.</p>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between border-t border-line px-5 py-3">
            <button
              type="button"
              disabled={
                !ticketPage.previous ||
                page <= 1
              }
              onClick={() =>
                changePage(Math.max(1, page - 1))
              }
              className={buttonStyles({ variant: "secondary", size: "small" })}
            >
              Previous
            </button>

            <span className="text-xs text-muted">
              Page {page}
            </span>

            <button
              type="button"
              disabled={
                !ticketPage.next
              }
              onClick={() =>
                changePage(page + 1)
              }
              className={buttonStyles({ variant: "secondary", size: "small" })}
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
            tags={tagPage.data.results}
            tagRequest={tagPage.request}
            tagsReady={!tagPage.loading && !tagPage.error}
            agents={agents}
            onChanged={handleChanged}
            onClose={closeTicket}
          />
        ) : (
          <section className="flex min-h-96 items-center justify-center rounded-2xl border border-dashed border-line-strong bg-surface/60 p-6 text-center sm:p-8">
            <div>
              <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 ring-8 ring-slate-50" aria-hidden="true"><MessagesSquare size={22} /></span>
              <p role={detailLoading ? "status" : undefined} className="font-semibold text-foreground">
                {detailLoading ? "Loading conversation..." : "Select a ticket"}
              </p>

              <p className="mt-1 text-sm text-muted">
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
            tags={tagPage.data.results}
            page={tagPage.page}
            onChanged={handleTagsChanged}
          />
        </div>
      ) : null}
    </main>
  );
}
