import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

import { makeSeller } from "../../__tests__/fixtures";
import { AdminSellerDetail } from "../admin-seller-detail";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "17" }),
}));

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(apiClient);
  mock.onGet(API_ENDPOINTS.auth.adminSellerDetail(17)).reply(200, makeSeller());
});

afterEach(() => {
  mock.restore();
});

function expectSellerDetails() {
  expect(
    screen.getByRole("heading", { name: "Registered Store" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Store Owner")).toBeInTheDocument();
  expect(screen.getByText("store@example.test")).toBeInTheDocument();
  expect(screen.getByText("+4917612345678")).toBeInTheDocument();
  expect(
    screen.getByText(`${Number("150000.00").toLocaleString()} IRR`),
  ).toBeInTheDocument();
  expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
}

describe("AdminSellerDetail with backend moderation responses", () => {
  it("keeps seller identity, money and approved status after unwrapping approval", async () => {
    const user = userEvent.setup();
    mock.onPost(API_ENDPOINTS.auth.adminSellerVerify(17)).reply(200, {
      message: "Seller Registered Store approved successfully",
      seller: makeSeller({
        status: "approved",
        verified_at: "2026-11-08T12:00:00Z",
      }),
    });

    render(<AdminSellerDetail />);
    await user.click(await screen.findByRole("button", { name: "Approve seller" }));

    expect(await screen.findByText("Seller approved.")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expectSellerDetails();
    expect(screen.queryByRole("button", { name: "Approve seller" })).not.toBeInTheDocument();
  });

  it("sends the trimmed reason and keeps it visible when the rejection envelope omits it", async () => {
    const user = userEvent.setup();
    mock.onPost(API_ENDPOINTS.auth.adminSellerReject(17)).reply(200, {
      message: "Seller Registered Store rejected",
      seller: makeSeller({ status: "rejected" }),
    });

    render(<AdminSellerDetail />);
    const reason = await screen.findByRole("textbox", { name: "Rejection reason" });
    await user.type(reason, "  Missing business registration.  ");
    await user.click(screen.getByRole("button", { name: "Reject seller" }));

    expect(await screen.findByText("Seller rejected.")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
    expect(screen.getByText("Missing business registration.")).toBeInTheDocument();
    expectSellerDetails();
    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      reason: "Missing business registration.",
    });
    expect(screen.queryByRole("button", { name: "Reject seller" })).not.toBeInTheDocument();
  });

  it("retains the entered explanation and pending seller when rejection fails", async () => {
    const user = userEvent.setup();
    mock.onPost(API_ENDPOINTS.auth.adminSellerReject(17)).reply(() => {
      const error = new AxiosError("Request failed", AxiosError.ERR_BAD_REQUEST);
      error.response = {
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: { error: "Only pending seller applications can be rejected" },
      };
      return Promise.reject(error);
    });

    render(<AdminSellerDetail />);
    const reason = await screen.findByRole("textbox", { name: "Rejection reason" });
    await user.type(reason, "Missing documents.");
    await user.click(screen.getByRole("button", { name: "Reject seller" }));

    expect(await screen.findByText("Only pending seller applications can be rejected")).toBeInTheDocument();
    expect(reason).toHaveValue("Missing documents.");
    expect(reason).toBeEnabled();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expectSellerDetails();
    expect(screen.queryByText("Seller rejected.")).not.toBeInTheDocument();
  });

  it("does not submit a blank explanation", async () => {
    const user = userEvent.setup();
    render(<AdminSellerDetail />);
    const reason = await screen.findByRole("textbox", { name: "Rejection reason" });
    await user.type(reason, "   ");
    await user.click(screen.getByRole("button", { name: "Reject seller" }));

    expect(screen.getByText("Please add a rejection reason before rejecting this seller.")).toBeInTheDocument();
    expect(mock.history.post).toHaveLength(0);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });
});
