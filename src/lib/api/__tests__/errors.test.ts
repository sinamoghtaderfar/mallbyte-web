import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";

import { getApiErrorMessage } from "../errors";

function makeAxiosError(data?: unknown, code?: string, hasResponse = true) {
  const error = Object.create(AxiosError.prototype) as AxiosError;

  error.code = code;

  if (hasResponse) {
    error.response = {
      data,
    } as AxiosError["response"];
  }

  return error;
}

describe("getApiErrorMessage", () => {
  it("returns detail/message/error fields directly", () => {
    expect(getApiErrorMessage(makeAxiosError({ detail: "Not found" }))).toBe(
      "Not found",
    );

    expect(
      getApiErrorMessage(makeAxiosError({ message: "Invalid input" })),
    ).toBe("Invalid input");

    expect(getApiErrorMessage(makeAxiosError({ error: "Access denied" }))).toBe(
      "Access denied",
    );
  });

  it("formats field-level DRF validation errors", () => {
    const message = getApiErrorMessage(
      makeAxiosError({
        receiver_phone: ["Phone number is invalid."],
        postal_code: ["Postal code must contain only digits."],
      }),
    );

    expect(message).toBe(
      "Receiver Phone: Phone number is invalid. Postal Code: Postal code must contain only digits.",
    );
  });

  it("formats nested validation errors", () => {
    const message = getApiErrorMessage(
      makeAxiosError({
        address: {
          city: ["City can only contain letters."],
        },
      }),
    );

    expect(message).toBe("Address: City: City can only contain letters.");
  });

  it("returns timeout message for aborted requests", () => {
    expect(
      getApiErrorMessage(makeAxiosError(undefined, "ECONNABORTED", false)),
    ).toBe("The request timed out. Please try again.");
  });

  it("returns connection message when there is no response", () => {
    expect(
      getApiErrorMessage(makeAxiosError(undefined, undefined, false)),
    ).toBe(
      "Could not connect to the server. Please check that the backend is running.",
    );
  });

  it("returns native Error message", () => {
    expect(getApiErrorMessage(new Error("Something broke"))).toBe(
      "Something broke",
    );
  });
});
