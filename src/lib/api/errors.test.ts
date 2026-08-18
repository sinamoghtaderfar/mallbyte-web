import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";

import { getApiErrorMessage } from "./errors";

function createAxiosError(data: unknown) {
  return new AxiosError(
    "Request failed",
    "ERR_BAD_REQUEST",
    undefined,
    undefined,
    {
      data,
      status: 400,
      statusText: "Bad Request",
      headers: {},
      config: {
        headers: {},
      },
    } as never,
  );
}

describe("api error helper", () => {
  it("reads detail from API errors", () => {
    const error = createAxiosError({
      detail: "Invalid credentials.",
    });

    expect(getApiErrorMessage(error)).toBe("Invalid credentials.");
  });

  it("reads message from API errors", () => {
    const error = createAxiosError({
      message: "Something failed.",
    });

    expect(getApiErrorMessage(error)).toBe("Something failed.");
  });

  it("reads native error messages", () => {
    expect(getApiErrorMessage(new Error("Network failed."))).toBe(
      "Network failed.",
    );
  });

  it("falls back for unknown errors", () => {
    expect(getApiErrorMessage(null)).toBe("Something went wrong.");
  });
});
