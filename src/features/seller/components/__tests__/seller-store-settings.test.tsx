import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SellerStoreSettings } from "../seller-store-settings";
import { getSellerStore, updateSellerStore } from "../../api";
import type { SellerStore } from "../../types";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("../../api", () => ({
  getSellerStore: vi.fn(),
  updateSellerStore: vi.fn(),
}));

const mockedGetSellerStore = vi.mocked(getSellerStore);
const mockedUpdateSellerStore = vi.mocked(updateSellerStore);

function makeStore(overrides: Partial<SellerStore> = {}): SellerStore {
  return {
    logo: null,
    banner: null,
    description: "Old store description",
    business_phone: "+4917612345678",
    business_email: "store@example.com",
    website: "https://example.com",
    bank_info: {
      account_holder: "Sina Moghtader Far",
      iban: "DE1234567890",
    },
    ...overrides,
  };
}

describe("SellerStoreSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads current store settings into the form", async () => {
    mockedGetSellerStore.mockResolvedValue(makeStore());

    render(<SellerStoreSettings />);

    expect(
      await screen.findByDisplayValue("Old store description"),
    ).toBeInTheDocument();

    expect(screen.getByDisplayValue("+4917612345678")).toBeInTheDocument();
    expect(screen.getByDisplayValue("store@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Sina Moghtader Far")).toBeInTheDocument();
    expect(screen.getByDisplayValue("DE1234567890")).toBeInTheDocument();
  });

  it("updates store settings and shows success message", async () => {
    const user = userEvent.setup();

    mockedGetSellerStore.mockResolvedValue(makeStore());
    mockedUpdateSellerStore.mockResolvedValue(
      makeStore({
        description: "Updated store description",
        business_phone: "+4917611111111",
        business_email: "new-store@example.com",
        website: "https://new-example.com",
        bank_info: {
          account_holder: "Sina Updated",
          iban: "DE9999999999",
        },
      }),
    );

    render(<SellerStoreSettings />);

    const descriptionInput = await screen.findByLabelText(/description/i);
    const phoneInput = screen.getByLabelText(/business phone/i);
    const emailInput = screen.getByLabelText(/business email/i);
    const websiteInput = screen.getByLabelText(/website/i);
    const accountHolderInput = screen.getByLabelText(/account holder/i);
    const ibanInput = screen.getByLabelText(/iban/i);

    await user.clear(descriptionInput);
    await user.type(descriptionInput, "Updated store description");

    await user.clear(phoneInput);
    await user.type(phoneInput, "+4917611111111");

    await user.clear(emailInput);
    await user.type(emailInput, "new-store@example.com");

    await user.clear(websiteInput);
    await user.type(websiteInput, "https://new-example.com");

    await user.clear(accountHolderInput);
    await user.type(accountHolderInput, "Sina Updated");

    await user.clear(ibanInput);
    await user.type(ibanInput, "DE9999999999");

    await user.click(
      screen.getByRole("button", { name: /save store settings/i }),
    );

    await waitFor(() => {
      expect(mockedUpdateSellerStore).toHaveBeenCalledWith({
        description: "Updated store description",
        business_phone: "+4917611111111",
        business_email: "new-store@example.com",
        website: "https://new-example.com",
        bank_info: {
          account_holder: "Sina Updated",
          iban: "DE9999999999",
        },
      });
    });

    expect(
      await screen.findByText("Store settings updated successfully."),
    ).toBeInTheDocument();
  });

  it("shows an error when store settings are not available", async () => {
    mockedGetSellerStore.mockRejectedValue(new Error("Seller is not approved."));

    render(<SellerStoreSettings />);

    expect(
      await screen.findByText(/store settings are not available/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Seller is not approved.")).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /check seller status/i }),
    ).toHaveAttribute("href", "/seller/status");
  });
});
