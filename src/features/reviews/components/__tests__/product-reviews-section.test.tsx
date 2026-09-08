import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/features/auth/auth-store";

import {
  createProductReview,
  getProductReviews,
  getProductReviewSummary,
  markReviewHelpful,
  markReviewNotHelpful,
} from "../../api";
import type { ProductReview, ProductReviewSummary } from "../../types";
import { ProductReviewsSection } from "../product-reviews-section";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("../../api", () => ({
  getProductReviews: vi.fn(),
  getProductReviewSummary: vi.fn(),
  createProductReview: vi.fn(),
  markReviewHelpful: vi.fn(),
  markReviewNotHelpful: vi.fn(),
}));

const mockedGetProductReviews = vi.mocked(getProductReviews);
const mockedGetProductReviewSummary = vi.mocked(getProductReviewSummary);
const mockedCreateProductReview = vi.mocked(createProductReview);
const mockedMarkReviewHelpful = vi.mocked(markReviewHelpful);
const mockedMarkReviewNotHelpful = vi.mocked(markReviewNotHelpful);

function makeSummary(
  overrides: Partial<ProductReviewSummary> = {},
): ProductReviewSummary {
  return {
    product_id: 10,
    average_rating: "4.50",
    reviews_count: 2,
    total_approved_reviews: 2,
    rating_breakdown: {
      "5": 1,
      "4": 1,
      "3": 0,
      "2": 0,
      "1": 0,
    },
    ...overrides,
  };
}

function makeReview(overrides: Partial<ProductReview> = {}): ProductReview {
  return {
    id: 1,
    customer: 1,
    customer_display: "Sina Moghtader Far",
    product: 10,
    product_name: "Mechanical Keyboard",
    order_item: 20,
    rating: 5,
    title: "Great keyboard",
    comment: "The typing feel is very good.",
    status: "approved",
    is_verified_purchase: true,
    approved_by: null,
    approved_by_display: null,
    approved_at: "2026-09-08T08:00:00Z",
    rejected_reason: "",
    helpful_count: 2,
    not_helpful_count: 1,
    created_at: "2026-09-08T08:00:00Z",
    updated_at: "2026-09-08T08:00:00Z",
    ...overrides,
  };
}

function setAuthenticatedUser() {
  useAuthStore.setState({
    user: {
      id: 1,
      email: "sina@example.com",
      phone: null,
      full_name: "Sina Moghtader Far",
      is_seller: false,
      email_verified: true,
    },
    isAuthenticated: true,
    isLoading: false,
    isBootstrapped: true,
  });
}

describe("ProductReviewsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerMock.push.mockClear();

    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isBootstrapped: true,
    });

    mockedGetProductReviewSummary.mockResolvedValue(makeSummary());
    mockedGetProductReviews.mockResolvedValue([makeReview()]);
  });

  it("loads summary and reviews", async () => {
    render(<ProductReviewsSection productId={10} />);

    expect(await screen.findByText("Customer reviews")).toBeInTheDocument();
    expect(screen.getByText("4.50")).toBeInTheDocument();
    expect(screen.getByText("2 reviews")).toBeInTheDocument();
    expect(screen.getByText("Great keyboard")).toBeInTheDocument();
    expect(screen.getByText("Verified purchase")).toBeInTheDocument();
    expect(
      screen.getByText("The typing feel is very good."),
    ).toBeInTheDocument();

    expect(mockedGetProductReviewSummary).toHaveBeenCalledWith(10);
    expect(mockedGetProductReviews).toHaveBeenCalledWith(10, {});
  });

  it("applies review filters", async () => {
    const user = userEvent.setup();

    mockedGetProductReviews
      .mockResolvedValueOnce([makeReview()])
      .mockResolvedValueOnce([
        makeReview({
          id: 2,
          title: "Filtered review",
          rating: 5,
        }),
      ]);

    render(<ProductReviewsSection productId={10} />);

    await screen.findByText("Great keyboard");

    await user.selectOptions(screen.getByLabelText(/rating filter/i), "5");
    await user.selectOptions(screen.getByLabelText(/verified filter/i), "true");
    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      expect(mockedGetProductReviews).toHaveBeenLastCalledWith(10, {
        rating: "5",
        is_verified_purchase: "true",
      });
    });

    expect(await screen.findByText("Filtered review")).toBeInTheDocument();
  });

  it("clears review filters", async () => {
    const user = userEvent.setup();

    render(<ProductReviewsSection productId={10} />);

    await screen.findByText("Great keyboard");

    await user.selectOptions(screen.getByLabelText(/rating filter/i), "5");
    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      expect(mockedGetProductReviews).toHaveBeenLastCalledWith(10, {
        rating: "5",
      });
    });

    await user.click(screen.getByRole("button", { name: /^clear$/i }));

    await waitFor(() => {
      expect(mockedGetProductReviews).toHaveBeenLastCalledWith(10, {});
    });
  });

  it("redirects unauthenticated users when submitting a review", async () => {
    const user = userEvent.setup();

    render(<ProductReviewsSection productId={10} />);

    await screen.findByText("Great keyboard");

    await user.type(screen.getByLabelText(/review title/i), "Nice product");
    await user.type(screen.getByLabelText(/review comment/i), "I liked it.");
    await user.click(screen.getByRole("button", { name: /submit review/i }));

    expect(routerMock.push).toHaveBeenCalledWith("/auth");
    expect(mockedCreateProductReview).not.toHaveBeenCalled();
  });

  it("submits a review for authenticated users", async () => {
    const user = userEvent.setup();
    setAuthenticatedUser();

    mockedCreateProductReview.mockResolvedValue(
      makeReview({
        id: 3,
        title: "Waiting for approval",
        status: "pending",
      }),
    );

    mockedGetProductReviews
      .mockResolvedValueOnce([makeReview()])
      .mockResolvedValueOnce([
        makeReview(),
        makeReview({
          id: 3,
          title: "Waiting for approval",
          status: "pending",
        }),
      ]);

    render(<ProductReviewsSection productId={10} />);

    await screen.findByText("Great keyboard");

    await user.selectOptions(screen.getByLabelText(/review rating/i), "4");
    await user.type(screen.getByLabelText(/review title/i), "Nice product");
    await user.type(screen.getByLabelText(/review comment/i), "I liked it.");
    await user.click(screen.getByRole("button", { name: /submit review/i }));

    await waitFor(() => {
      expect(mockedCreateProductReview).toHaveBeenCalledWith({
        product: 10,
        rating: 4,
        title: "Nice product",
        comment: "I liked it.",
      });
    });

    expect(
      await screen.findByText("Review submitted and is waiting for approval."),
    ).toBeInTheDocument();
    expect(screen.getByText("Waiting for approval")).toBeInTheDocument();
  });

  it("shows review submit errors", async () => {
    const user = userEvent.setup();
    setAuthenticatedUser();

    mockedCreateProductReview.mockRejectedValue(
      new Error("You can only review products from delivered orders."),
    );

    render(<ProductReviewsSection productId={10} />);

    await screen.findByText("Great keyboard");

    await user.type(screen.getByLabelText(/review title/i), "Nice product");
    await user.type(screen.getByLabelText(/review comment/i), "I liked it.");
    await user.click(screen.getByRole("button", { name: /submit review/i }));

    expect(
      await screen.findByText(
        "You can only review products from delivered orders.",
      ),
    ).toBeInTheDocument();
  });

  it("marks a review as helpful", async () => {
    const user = userEvent.setup();
    setAuthenticatedUser();

    mockedMarkReviewHelpful.mockResolvedValue(
      makeReview({
        helpful_count: 3,
      }),
    );

    render(<ProductReviewsSection productId={10} />);

    await user.click(
      await screen.findByRole("button", { name: /helpful \(2\)/i }),
    );

    await waitFor(() => {
      expect(mockedMarkReviewHelpful).toHaveBeenCalledWith(1);
    });

    expect(
      await screen.findByRole("button", { name: /helpful \(3\)/i }),
    ).toBeInTheDocument();
  });

  it("marks a review as not helpful", async () => {
    const user = userEvent.setup();
    setAuthenticatedUser();

    mockedMarkReviewNotHelpful.mockResolvedValue(
      makeReview({
        not_helpful_count: 2,
      }),
    );

    render(<ProductReviewsSection productId={10} />);

    await user.click(
      await screen.findByRole("button", { name: /not helpful \(1\)/i }),
    );

    await waitFor(() => {
      expect(mockedMarkReviewNotHelpful).toHaveBeenCalledWith(1);
    });

    expect(
      await screen.findByRole("button", { name: /not helpful \(2\)/i }),
    ).toBeInTheDocument();
  });

  it("redirects unauthenticated users when voting", async () => {
    const user = userEvent.setup();

    render(<ProductReviewsSection productId={10} />);

    await user.click(
      await screen.findByRole("button", { name: /helpful \(2\)/i }),
    );

    expect(routerMock.push).toHaveBeenCalledWith("/auth");
    expect(mockedMarkReviewHelpful).not.toHaveBeenCalled();
  });

  it("shows empty review state", async () => {
    mockedGetProductReviews.mockResolvedValue([]);

    render(<ProductReviewsSection productId={10} />);

    expect(await screen.findByText(/no reviews yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /reviews will appear here after customers submit feedback/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows load error", async () => {
    mockedGetProductReviewSummary.mockRejectedValue(
      new Error("Reviews are not available."),
    );

    render(<ProductReviewsSection productId={10} />);

    expect(
      await screen.findByText("Reviews are not available."),
    ).toBeInTheDocument();
  });
});
