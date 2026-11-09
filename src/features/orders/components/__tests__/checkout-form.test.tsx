import type { ReactNode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAddresses } from "@/features/addresses/api";
import type { Address } from "@/features/addresses/types";
import { getCart } from "@/features/cart/api";
import { useCartStore } from "@/features/cart/cart-store";
import type { Cart } from "@/features/cart/types";
import { validateDiscountCode } from "@/features/discounts/api";
import type { DiscountValidationResult } from "@/features/discounts/types";

import { checkout } from "../../api";
import type { OrderDetail } from "../../types";
import { CheckoutForm } from "../checkout-form";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

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

vi.mock("@/features/cart/api", () => ({
  getCart: vi.fn(),
}));

vi.mock("@/features/addresses/api", () => ({
  getAddresses: vi.fn(),
}));

vi.mock("@/features/discounts/api", () => ({
  validateDiscountCode: vi.fn(),
}));

vi.mock("../../api", () => ({
  checkout: vi.fn(),
}));

const mockedGetCart = vi.mocked(getCart);
const mockedGetAddresses = vi.mocked(getAddresses);
const mockedValidateDiscountCode = vi.mocked(validateDiscountCode);
const mockedCheckout = vi.mocked(checkout);

function makeCart(overrides: Partial<Cart> = {}): Cart {
  return {
    id: 1,
    user: 1,
    total_items: 2,
    subtotal: "1200000",
    created_at: "2026-09-08T18:00:00Z",
    updated_at: "2026-09-08T18:00:00Z",
    items: [
      {
        id: 1,
        product: 10,
        product_name: "Mechanical Keyboard",
        product_sku: "KB-001",
        product_price: "600000",
        available_stock: 8,
        quantity: 2,
        unit_price: "600000",
        total_price: "1200000",
        created_at: "2026-09-08T18:00:00Z",
        updated_at: "2026-09-08T18:00:00Z",
      },
    ],
    ...overrides,
  };
}

function makeAddress(overrides: Partial<Address> = {}): Address {
  return {
    id: 1,
    user: 1,
    title: "Home",
    province: "Bavaria",
    city: "Bamberg",
    street: "Main street",
    alley: "",
    building_number: "10",
    floor: "2",
    unit: "4",
    postal_code: "96047",
    receiver_name: "Sina Moghtader Far",
    receiver_phone: "09123456789",
    is_default: true,
    created_at: "2026-09-08T18:00:00Z",
    updated_at: "2026-09-08T18:00:00Z",
    ...overrides,
  };
}

function makeOrder(overrides: Partial<OrderDetail> = {}): OrderDetail {
  return {
    id: 55,
    order_number: "ORD-55",
    user: 1,
    status: "pending_payment",
    status_display: "Pending payment",
    payment_status: "unpaid",
    payment_status_display: "Unpaid",
    subtotal: "1200000",
    discount_amount: "120000",
    shipping_cost: "0",
    tax_amount: "0",
    total_amount: "1080000",
    receiver_name: "Sina Moghtader Far",
    receiver_phone: "09123456789",
    province: "Bavaria",
    city: "Bamberg",
    address: "Main street, Building 10, Floor 2, Unit 4",
    postal_code: "96047",
    customer_note: "",
    admin_note: "",
    paid_at: null,
    cancelled_at: null,
    delivered_at: null,
    created_at: "2026-09-08T18:00:00Z",
    updated_at: "2026-09-08T18:00:00Z",
    items: [],
    status_history: [],
    ...overrides,
  };
}

async function renderLoadedCheckout() {
  mockedGetCart.mockResolvedValue(makeCart());
  mockedGetAddresses.mockResolvedValue([makeAddress()]);

  render(<CheckoutForm />);

  await screen.findByRole("heading", { name: /shipping information/i });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function discount(code: string): DiscountValidationResult {
  return {
    code,
    title: code,
    discount_type: "percentage",
    discount_amount: "120000",
    cart_subtotal: "1200000",
    total_after_discount: "1080000",
  };
}

describe("CheckoutForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerMock.push.mockClear();
    useCartStore.getState().clearCartState();
  });

  it("loads cart, saved addresses, and order summary", async () => {
    await renderLoadedCheckout();

    expect(screen.getByText("Mechanical Keyboard")).toBeInTheDocument();
    expect(screen.getByText("Home (Default) - Bamberg")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Sina Moghtader Far")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Bavaria")).toBeInTheDocument();
    expect(screen.getAllByText("1,200,000").length).toBeGreaterThanOrEqual(1);
  });

  it("validates a discount code and shows discount preview", async () => {
    const user = userEvent.setup();

    mockedValidateDiscountCode.mockResolvedValue({
      code: "SAVE10",
      title: "Ten percent off",
      discount_type: "percentage",
      discount_amount: "120000",
      cart_subtotal: "1200000",
      total_after_discount: "1080000",
    });

    await renderLoadedCheckout();

    await user.type(screen.getByLabelText(/discount code/i), "save10");
    await user.click(screen.getByRole("button", { name: /apply code/i }));

    await waitFor(() => {
      expect(mockedValidateDiscountCode).toHaveBeenCalledWith({
        code: "save10",
      });
    });

    expect(
      await screen.findByText("Ten percent off applied"),
    ).toBeInTheDocument();
    expect(screen.getByText("Discount: 120,000")).toBeInTheDocument();
    expect(screen.getByText("Discount (SAVE10)")).toBeInTheDocument();
    expect(screen.getByText("-120,000")).toBeInTheDocument();
    expect(screen.getByText("1,080,000")).toBeInTheDocument();
  });

  it("shows error when applying an empty discount code", async () => {
    const user = userEvent.setup();

    await renderLoadedCheckout();

    await user.click(screen.getByRole("button", { name: /apply code/i }));

    expect(
      await screen.findByText("Enter a discount code first."),
    ).toBeInTheDocument();
    expect(mockedValidateDiscountCode).not.toHaveBeenCalled();
  });

  it("shows discount validation errors", async () => {
    const user = userEvent.setup();

    mockedValidateDiscountCode.mockRejectedValue(
      new Error("This discount has expired."),
    );

    await renderLoadedCheckout();

    await user.type(screen.getByLabelText(/discount code/i), "oldcode");
    await user.click(screen.getByRole("button", { name: /apply code/i }));

    expect(
      await screen.findByText("This discount has expired."),
    ).toBeInTheDocument();
  });

  it("removes an applied discount", async () => {
    const user = userEvent.setup();

    mockedValidateDiscountCode.mockResolvedValue({
      code: "SAVE10",
      title: "Ten percent off",
      discount_type: "percentage",
      discount_amount: "120000",
      cart_subtotal: "1200000",
      total_after_discount: "1080000",
    });

    await renderLoadedCheckout();

    await user.type(screen.getByLabelText(/discount code/i), "SAVE10");
    await user.click(screen.getByRole("button", { name: /apply code/i }));

    expect(
      await screen.findByText("Ten percent off applied"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /remove/i }));

    expect(
      screen.queryByText("Ten percent off applied"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Discount (SAVE10)")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/discount code/i)).toHaveValue("");
  });

  it("places order with the validated discount code", async () => {
    const user = userEvent.setup();

    mockedValidateDiscountCode.mockResolvedValue({
      code: "SAVE10",
      title: "Ten percent off",
      discount_type: "percentage",
      discount_amount: "120000",
      cart_subtotal: "1200000",
      total_after_discount: "1080000",
    });
    mockedCheckout.mockResolvedValue(makeOrder());

    await renderLoadedCheckout();

    await user.type(screen.getByLabelText(/discount code/i), "save10");
    await user.click(screen.getByRole("button", { name: /apply code/i }));

    await screen.findByText("Ten percent off applied");

    await user.click(screen.getByRole("button", { name: /place order/i }));

    await waitFor(() => {
      expect(mockedCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          receiver_name: "Sina Moghtader Far",
          province: "Bavaria",
          city: "Bamberg",
          postal_code: "96047",
          discount_code: "SAVE10",
          shipping_cost: 0,
        }),
      );
    });

    expect(routerMock.push).toHaveBeenCalledWith("/orders/55");
  });

  it("shows empty cart state", async () => {
    mockedGetCart.mockResolvedValue(makeCart({ items: [], total_items: 0 }));
    mockedGetAddresses.mockResolvedValue([]);

    render(<CheckoutForm />);

    expect(await screen.findByText(/your cart is empty/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /browse products/i }),
    ).toHaveAttribute("href", "/products");
  });

  it("shows checkout loading error", async () => {
    mockedGetCart.mockRejectedValue(new Error("Checkout is not available."));
    mockedGetAddresses.mockResolvedValue([]);

    render(<CheckoutForm />);

    expect(
      await screen.findByText(/could not load checkout/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Checkout is not available.")).toBeInTheDocument();
  });

  it("ignores an old coupon success after a newer code validates and submits the newer code", async () => {
    const user = userEvent.setup();
    const old = deferred<DiscountValidationResult>();
    const current = deferred<DiscountValidationResult>();
    mockedValidateDiscountCode
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(current.promise);
    mockedCheckout.mockResolvedValue(makeOrder());
    await renderLoadedCheckout();

    const input = screen.getByLabelText(/discount code/i);
    await user.type(input, "OLD");
    await user.click(screen.getByRole("button", { name: /apply code/i }));
    await user.clear(input);
    await user.type(input, "NEW");
    await user.click(screen.getByRole("button", { name: /apply code/i }));
    await act(async () => current.resolve(discount("NEW")));
    await act(async () => old.resolve(discount("OLD")));

    expect(input).toHaveValue("NEW");
    expect(screen.getByText("NEW applied")).toBeInTheDocument();
    expect(screen.queryByText("OLD applied")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /place order/i }));
    expect(mockedCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ discount_code: "NEW" }),
    );
  });

  it("keeps a newer coupon request pending when an outdated validation fails", async () => {
    const user = userEvent.setup();
    const old = deferred<DiscountValidationResult>();
    const current = deferred<DiscountValidationResult>();
    mockedValidateDiscountCode
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(current.promise);
    await renderLoadedCheckout();
    const input = screen.getByLabelText(/discount code/i);
    await user.type(input, "OLD");
    await user.click(screen.getByRole("button", { name: /apply code/i }));
    await user.clear(input);
    await user.type(input, "NEW");
    await user.click(screen.getByRole("button", { name: /apply code/i }));

    await act(async () => old.reject(new Error("Old code expired")));
    expect(screen.queryByText("Old code expired")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /checking/i })).toBeDisabled();
    await act(async () => current.resolve(discount("NEW")));
    expect(screen.getByText("NEW applied")).toBeInTheDocument();
  });

  it("submits the entered coupon while validation is pending and retires that response", async () => {
    const user = userEvent.setup();
    const validation = deferred<DiscountValidationResult>();
    const order = deferred<OrderDetail>();
    mockedValidateDiscountCode.mockReturnValueOnce(validation.promise);
    mockedCheckout.mockReturnValueOnce(order.promise);
    await renderLoadedCheckout();
    await user.type(screen.getByLabelText(/discount code/i), "intended");
    await user.click(screen.getByRole("button", { name: /apply code/i }));
    await user.click(screen.getByRole("button", { name: /place order/i }));
    expect(mockedCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ discount_code: "intended" }),
    );

    await act(async () => validation.resolve(discount("CANONICAL")));
    expect(screen.getByLabelText(/discount code/i)).toHaveValue("intended");
    expect(screen.queryByText("CANONICAL applied")).not.toBeInTheDocument();
    await act(async () => order.resolve(makeOrder()));
  });

  it("allows manual checkout after optional saved-address loading fails", async () => {
    const user = userEvent.setup();
    mockedGetCart.mockResolvedValue(makeCart());
    mockedGetAddresses.mockRejectedValueOnce(
      new Error("Address service offline"),
    );
    mockedCheckout.mockResolvedValue(makeOrder());
    render(<CheckoutForm />);
    await screen.findByRole("heading", { name: /shipping information/i });
    expect(
      await screen.findByText(/saved addresses could not be loaded/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/could not load checkout/i),
    ).not.toBeInTheDocument();
    for (const [label, value] of [
      [/^receiver name$/i, "Manual Customer"],
      [/^receiver phone$/i, "09123456789"],
      [/^province$/i, "Bavaria"],
      [/^city$/i, "Bamberg"],
      [/^address$/i, "Manual street 12"],
      [/^postal code$/i, "96047"],
    ] as const)
      await user.type(screen.getByLabelText(label), value);
    await user.click(screen.getByRole("button", { name: /place order/i }));
    expect(mockedCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        receiver_name: "Manual Customer",
        address: "Manual street 12",
      }),
    );
    expect(routerMock.push).toHaveBeenCalledWith("/orders/55");
  });

  it("renders checkout before saved addresses finish and preserves shipping edits on their late success", async () => {
    const user = userEvent.setup();
    const addresses = deferred<Address[]>();
    mockedGetCart.mockResolvedValue(makeCart());
    mockedGetAddresses.mockReturnValueOnce(addresses.promise);
    render(<CheckoutForm />);
    await screen.findByRole("heading", { name: /shipping information/i });
    expect(screen.getByText(/loading saved addresses/i)).toBeInTheDocument();
    await user.type(
      screen.getByLabelText(/^receiver name$/i),
      "My intended recipient",
    );

    await act(async () => addresses.resolve([makeAddress()]));
    expect(screen.getByLabelText(/^receiver name$/i)).toHaveValue(
      "My intended recipient",
    );
    expect(screen.getByLabelText(/^province$/i)).toHaveValue("");
    expect(screen.getByLabelText(/^saved address$/i)).toHaveValue("");
    await user.selectOptions(screen.getByLabelText(/^saved address$/i), "1");
    expect(screen.getByLabelText(/^receiver name$/i)).toHaveValue(
      "Sina Moghtader Far",
    );
  });

  it("retries optional saved-address loading without overwriting manual shipping", async () => {
    const user = userEvent.setup();
    mockedGetCart.mockResolvedValue(makeCart());
    mockedGetAddresses
      .mockRejectedValueOnce(new Error("Address service offline"))
      .mockResolvedValueOnce([makeAddress()]);
    render(<CheckoutForm />);
    await screen.findByText(/saved addresses could not be loaded/i);
    await user.type(
      screen.getByLabelText(/^receiver name$/i),
      "Manual recipient",
    );
    await user.click(
      screen.getByRole("button", { name: /retry saved addresses/i }),
    );
    await screen.findByText("Home (Default) - Bamberg");
    expect(screen.getByLabelText(/^receiver name$/i)).toHaveValue(
      "Manual recipient",
    );
    expect(
      screen.queryByText(/saved addresses could not be loaded/i),
    ).not.toBeInTheDocument();
  });
});
