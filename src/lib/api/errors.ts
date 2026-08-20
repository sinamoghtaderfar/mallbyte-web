import { AxiosError } from "axios";

type ApiErrorValue =
  | string
  | string[]
  | Record<string, unknown>
  | Record<string, unknown>[];

type ApiErrorData = {
  detail?: string;
  message?: string;
  error?: string;
  non_field_errors?: string[];
  [key: string]: ApiErrorValue | undefined;
};

function humanizeFieldName(fieldName: string) {
  return fieldName
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatApiErrorValue(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const messages = value
      .map((item) => formatApiErrorValue(item))
      .filter(Boolean);

    return messages.length ? messages.join(" ") : null;
  }

  if (value && typeof value === "object") {
    const messages = Object.entries(value as Record<string, unknown>)
      .map(([field, fieldValue]) => {
        const message = formatApiErrorValue(fieldValue);

        if (!message) {
          return null;
        }

        return `${humanizeFieldName(field)}: ${message}`;
      })
      .filter(Boolean);

    return messages.length ? messages.join(" ") : null;
  }

  return null;
}

function formatApiErrorData(data: ApiErrorData | undefined) {
  if (!data) {
    return null;
  }

  if (data.detail) return data.detail;
  if (data.message) return data.message;
  if (data.error) return data.error;
  if (data.non_field_errors?.length) return data.non_field_errors[0];

  const fieldMessages = Object.entries(data)
    .map(([field, value]) => {
      if (
        field === "detail" ||
        field === "message" ||
        field === "error" ||
        field === "non_field_errors"
      ) {
        return null;
      }

      const message = formatApiErrorValue(value);

      if (!message) {
        return null;
      }

      return `${humanizeFieldName(field)}: ${message}`;
    })
    .filter(Boolean);

  return fieldMessages.length ? fieldMessages.join(" ") : null;
}

export function getApiErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorData | undefined;
    const apiMessage = formatApiErrorData(data);

    if (apiMessage) {
      return apiMessage;
    }

    if (error.code === "ECONNABORTED") {
      return "The request timed out. Please try again.";
    }

    if (!error.response) {
      return "Could not connect to the server. Please check that the backend is running.";
    }

    return "Something went wrong while processing the request.";
  }

  if (error instanceof Error) return error.message;

  return "Something went wrong.";
}
