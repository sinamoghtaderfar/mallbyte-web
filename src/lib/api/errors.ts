import { AxiosError } from "axios";

type ApiErrorData = {
  detail?: string;
  message?: string;
  error?: string;
  non_field_errors?: string[];
};

export function getApiErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorData | undefined;

    if (data?.detail) {
      return data.detail;
    }

    if (data?.message) {
      return data.message;
    }

    if (data?.error) {
      return data.error;
    }

    if (data?.non_field_errors?.length) {
      return data.non_field_errors[0];
    }

    return "Something went wrong while connecting to the server.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}
