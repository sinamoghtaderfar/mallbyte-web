import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OtpLoginForm } from "./otp-login-form";
import { useAuthStore } from "../auth-store";
import { requestOtp, verifyOtp, setupAdminMfa, finishAdminMfa } from "../api";

const routerPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));
vi.mock("../api", () => ({
  requestOtp: vi.fn(),
  verifyOtp: vi.fn(),
  setupAdminMfa: vi.fn(),
  finishAdminMfa: vi.fn(),
}));

const user = {
  id: 1, email: "admin@example.com", phone: null, full_name: "Admin",
  is_seller: false, is_staff: true, is_superuser: true, email_verified: true,
};

async function reachEmailCode() {
  const person = userEvent.setup();
  render(<OtpLoginForm />);
  await person.type(screen.getByLabelText("Email address"), "admin@example.com");
  await person.click(screen.getByRole("button", { name: "Send code" }));
  expect(await screen.findByLabelText("Email verification code")).toBeInTheDocument();
  await person.type(screen.getByLabelText("Email verification code"), "123456");
  await person.click(screen.getByRole("button", { name: "Verify email" }));
  return person;
}

describe("OtpLoginForm privileged MFA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clearAuth();
    vi.mocked(requestOtp).mockResolvedValue({
      message: "OTP sent", email: "ad***@example.com", delivery_channel: "email", expires_in: 300,
    });
  });

  it("does not authenticate a privileged user after email OTP alone", async () => {
    vi.mocked(verifyOtp).mockResolvedValue({
      mfa_required: true, challenge: "challenge-value", mfa_enrolled: true,
    });
    await reachEmailCode();
    expect(await screen.findByLabelText("Authenticator code")).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("requires password enrollment, then shows one-time recovery codes", async () => {
    const person = userEvent.setup();
    vi.mocked(verifyOtp).mockResolvedValue({
      mfa_required: true, challenge: "enroll-value", mfa_enrolled: false,
    });
    vi.mocked(setupAdminMfa).mockResolvedValue({
      secret: "BASE32TESTSECRET", otpauth_uri: "otpauth://totp/test",
      message: "Add authenticator",
    });
    vi.mocked(finishAdminMfa).mockResolvedValue({
      user, access: "verified", is_new: false, recovery_codes: ["AABBCCDDEEFF", "001122334455"],
    });
    await reachEmailCode();
    await person.type(await screen.findByLabelText("Existing admin password"), "AdminPass123!");
    await person.click(screen.getByRole("button", { name: "Set up authenticator" }));
    expect(await screen.findByText("BASE32TESTSECRET")).toBeInTheDocument();
    await person.type(screen.getByLabelText("Authenticator code"), "654321");
    await person.click(screen.getByRole("button", { name: "Enable MFA and sign in" }));
    expect(await screen.findByText("AABBCCDDEEFF")).toBeInTheDocument();
    expect(routerPush).not.toHaveBeenCalled();
    await person.click(screen.getByRole("button", { name: "I saved my recovery codes" }));
    expect(routerPush).toHaveBeenCalledWith("/admin/super");
  });

  it("accepts a one-time recovery code after enrollment", async () => {
    const person = userEvent.setup();
    vi.mocked(verifyOtp).mockResolvedValue({
      mfa_required: true, challenge: "login-value", mfa_enrolled: true,
    });
    vi.mocked(finishAdminMfa).mockResolvedValue({ user, access: "valid", is_new: false });
    await reachEmailCode();
    await person.click(await screen.findByRole("button", { name: "Use a recovery code" }));
    await person.type(screen.getByLabelText("Recovery code"), "ABCDEF123456");
    await person.click(screen.getByRole("button", { name: "Verify and sign in" }));
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/admin/super"));
    expect(finishAdminMfa).toHaveBeenCalledWith(
      { challenge: "login-value", code: "ABCDEF123456" }, false,
    );
  });

  it("keeps regular customer login unchanged", async () => {
    const customer = { ...user, is_staff: false, is_superuser: false };
    vi.mocked(verifyOtp).mockResolvedValue({ user: customer, access: "regular", is_new: false });
    await reachEmailCode();
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/"));
  });
});
