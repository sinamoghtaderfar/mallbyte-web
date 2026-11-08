import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

import { rejectAdminSeller, verifyAdminSeller } from "../api";
import { makeSeller } from "./fixtures";

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(apiClient);
});

afterEach(() => {
  mock.restore();
});

describe("admin seller moderation contracts", () => {
  it("unwraps the backend approval envelope", async () => {
    const seller = makeSeller({ status: "approved" });
    mock.onPost(API_ENDPOINTS.auth.adminSellerVerify(17)).reply(200, {
      message: "Seller Registered Store approved successfully",
      seller,
    });

    expect(await verifyAdminSeller(17)).toEqual(seller);
    expect(mock.history.post).toHaveLength(1);
    expect(mock.history.post[0].data).toBeUndefined();
  });

  it("submits reason and unwraps rejection while retaining the omitted explanation", async () => {
    const seller = makeSeller({ status: "rejected" });
    mock.onPost(API_ENDPOINTS.auth.adminSellerReject(17)).reply(200, {
      message: "Seller Registered Store rejected",
      seller,
    });

    const result = await rejectAdminSeller(17, {
      reason: "  Missing business registration.  ",
    });

    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      reason: "Missing business registration.",
    });
    expect(result).toEqual({
      ...seller,
      rejection_reason: "Missing business registration.",
    });
  });

  it("keeps the server's reason authoritative when one is returned", async () => {
    const seller = makeSeller({
      status: "rejected",
      rejection_reason: "Reviewed explanation from the server.",
    });
    mock.onPost(API_ENDPOINTS.auth.adminSellerReject(17)).reply(200, {
      message: "Seller Registered Store rejected",
      seller,
    });

    expect(
      await rejectAdminSeller(17, { reason: "Submitted explanation." }),
    ).toEqual(seller);
  });
});
