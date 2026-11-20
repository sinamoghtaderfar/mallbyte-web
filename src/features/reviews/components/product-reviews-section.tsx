"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ThumbsDown, ThumbsUp, BadgeCheck, MessageSquareText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Rating } from "@/components/ui/price";
import { Notice } from "@/components/ui/states";
import { useAuthStore } from "@/features/auth/auth-store";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { PaginatedResponse } from "@/types/api";

import {
  createProductReview,
  getProductReviews,
  getProductReviewSummary,
  markReviewHelpful,
  markReviewNotHelpful,
} from "../api";
import type {
  ProductReview,
  ProductReviewFilters,
  ProductReviewSummary,
} from "../types";

type ProductReviewsSectionProps = {
  productId: number | string;
};

type ReviewFormState = {
  rating: string;
  title: string;
  comment: string;
};

const emptyFilters = {
  rating: "",
  is_verified_purchase: "",
};

const initialForm: ReviewFormState = {
  rating: "5",
  title: "",
  comment: "",
};

function buildFilters(filters: typeof emptyFilters): ProductReviewFilters {
  const params: ProductReviewFilters = {};

  if (filters.rating) {
    params.rating = filters.rating;
  }

  if (filters.is_verified_purchase) {
    params.is_verified_purchase = filters.is_verified_purchase;
  }

  return params;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

function getStatusBadgeClass(status: string) {
  if (status === "approved") {
    return "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200";
  }

  if (status === "rejected") {
    return "bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200";
  }

  if (status === "hidden") {
    return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200";
  }

  return "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200";
}

function updateReviewInList(
  reviews: ProductReview[],
  updatedReview: ProductReview,
) {
  return reviews.map((review) =>
    review.id === updatedReview.id ? updatedReview : review,
  );
}

export function ProductReviewsSection({
  productId,
}: ProductReviewsSectionProps) {
  return <ProductReviews key={String(productId)} productId={productId} />;
}

function ProductReviews({ productId }: ProductReviewsSectionProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [summary, setSummary] = useState<ProductReviewSummary | null>(null);
  const [reviewPage, setReviewPage] = useState<
    PaginatedResponse<ProductReview>
  >({ count: 0, next: null, previous: null, results: [] });
  const reviews = reviewPage.results;
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [activeFilters, setActiveFilters] = useState<ProductReviewFilters>({});
  const [form, setForm] = useState<ReviewFormState>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [votingReviewId, setVotingReviewId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadReviewData() {
      setIsLoading(true);
      setError("");

      try {
        const [summaryData, reviewsData] = await Promise.all([
          getProductReviewSummary(productId),
          getProductReviews(productId, activeFilters, page),
        ]);

        if (isMounted) {
          setSummary(summaryData);
          setReviewPage(reviewsData);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadReviewData();

    return () => {
      isMounted = false;
    };
  }, [activeFilters, productId, page, reload]);

  function handleFilterChange(event: ChangeEvent<HTMLSelectElement>) {
    const { name, value } = event.target;

    setDraftFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleApplyFilters() {
    setPage(1);
    setActiveFilters(buildFilters(draftFilters));
  }

  function handleClearFilters() {
    setPage(1);
    setDraftFilters(emptyFilters);
    setActiveFilters({});
  }

  function handleFormChange(
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAuthenticated) {
      router.push("/auth");
      return;
    }

    setFormError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      await createProductReview({
        product: Number(productId),
        rating: Number(form.rating),
        title: form.title.trim(),
        comment: form.comment.trim(),
      });

      setForm(initialForm);
      setSuccessMessage("Review submitted and is waiting for approval.");
      // Refresh the current query through the guarded effect, rather than
      // installing results for a filter captured before submission completed.
      setPage(1);
      setReload((value) => value + 1);
    } catch (submitError) {
      setFormError(getApiErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVote(
    reviewId: number,
    voteType: "helpful" | "not_helpful",
  ) {
    if (!isAuthenticated) {
      router.push("/auth");
      return;
    }

    setFormError("");
    setVotingReviewId(reviewId);

    try {
      const updatedReview =
        voteType === "helpful"
          ? await markReviewHelpful(reviewId)
          : await markReviewNotHelpful(reviewId);

      setReviewPage((current) => ({
        ...current,
        results: updateReviewInList(current.results, updatedReview),
      }));
    } catch (voteError) {
      setFormError(getApiErrorMessage(voteError));
    } finally {
      setVotingReviewId(null);
    }
  }

  const label = "text-sm font-medium text-slate-800";
  const totalForBars = summary ? Math.max(1, ...Object.values(summary.rating_breakdown)) : 1;
  return (
    <section aria-labelledby="customer-reviews-heading" className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
      <div className="min-w-0 lg:sticky lg:top-36 lg:self-start">
        <p className="mb-eyebrow">
          Reviews
        </p>

        <h2 id="customer-reviews-heading" className="mb-display mt-3 text-[2.25rem] text-ink">
          Customer reviews
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted">
          Read customer feedback, filter reviews, and leave your own review
          after a delivered order.
        </p>

        {summary ? (
          <div className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <div className="flex items-end gap-4">
              <p data-numeric className="text-5xl font-semibold leading-none tracking-tight text-ink">
                {summary.average_rating}
              </p>
              <div className="pb-0.5">
                <Rating value={summary.average_rating} size={15} />
                <p className="mt-1 text-sm text-muted">
                  {summary.reviews_count} approved review
                  {summary.reviews_count === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <ul className="mt-5 space-y-2" aria-label="Rating breakdown">
              {(["5", "4", "3", "2", "1"] as const).map((rating) => (
                <li key={rating} className="grid grid-cols-[3.25rem_1fr_2rem] items-center gap-3 text-sm">
                  <span className="text-slate-700">{rating} star</span>
                  <span className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                    <span className="block h-full rounded-full bg-ink" style={{ width: `${(summary.rating_breakdown[rating] / totalForBars) * 100}%` }} />
                  </span>
                  <span data-numeric className="text-right font-medium text-slate-900">{summary.rating_breakdown[rating]}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!isLoading && !error ? (
          <form
            onSubmit={handleSubmitReview}
            className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-sm"
          >
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-950">
              <MessageSquareText size={17} aria-hidden="true" />Write a review
            </h3>

            <p className="mt-1.5 text-xs leading-5 text-muted">
              Reviews are submitted for moderation. The backend only accepts
              reviews for delivered orders.
            </p>

            {formError ? (
              <Notice tone="danger" className="mt-4">{formError}</Notice>
            ) : null}

            {successMessage ? (
              <Notice tone="success" className="mt-4">{successMessage}</Notice>
            ) : null}

            <div className="mt-4 grid gap-3.5">
              <label className="block">
                <span className={label}>
                  Review rating
                </span>
                <select
                  name="rating"
                  value={form.rating}
                  onChange={handleFormChange}
                  className="mt-1.5 mb-control mb-select"
                >
                  <option value="5">5 stars</option>
                  <option value="4">4 stars</option>
                  <option value="3">3 stars</option>
                  <option value="2">2 stars</option>
                  <option value="1">1 star</option>
                </select>
              </label>

              <label className="block">
                <span className={label}>
                  Review title
                </span>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  required
                  maxLength={120}
                  className="mt-1.5 mb-control"
                />
              </label>

              <label className="block">
                <span className={label}>
                  Review comment
                </span>
                <textarea
                  name="comment"
                  value={form.comment}
                  onChange={handleFormChange}
                  required
                  rows={4}
                  className="mt-1.5 mb-control"
                />
              </label>
            </div>

            <Button type="submit" loading={isSubmitting} className="mt-4 w-full">
              {isSubmitting ? "Submitting..." : "Submit review"}
            </Button>
          </form>
        ) : null}
      </div>

      <div className="min-w-0">
        {isLoading ? (
          <div role="status" className="space-y-4">
            <span className="sr-only">Loading reviews...</span>
            {[0, 1, 2].map((i) => <div key={i} aria-hidden="true" className="mb-skeleton h-36 rounded-2xl" />)}
          </div>
        ) : null}

        {!isLoading && error ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {error}
            <button
              type="button"
              onClick={() => setReload((value) => value + 1)}
              className="ml-3 font-semibold underline"
            >
              Retry reviews
            </button>
            {page > 1 && (
              <button
                type="button"
                onClick={() => setPage((value) => value - 1)}
                className="ml-3 font-semibold underline"
              >
                Previous review page
              </button>
            )}
          </div>
        ) : null}

        {!isLoading && !error ? (
          <>
            <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end">
              <label className="block flex-1">
                <span className={label}>
                  Rating filter
                </span>
                <select
                  name="rating"
                  value={draftFilters.rating}
                  onChange={handleFilterChange}
                  className="mt-1.5 mb-control mb-select"
                >
                  <option value="">All ratings</option>
                  <option value="5">5 stars</option>
                  <option value="4">4 stars</option>
                  <option value="3">3 stars</option>
                  <option value="2">2 stars</option>
                  <option value="1">1 star</option>
                </select>
              </label>

              <label className="block flex-1">
                <span className={label}>
                  Verified filter
                </span>
                <select
                  name="is_verified_purchase"
                  value={draftFilters.is_verified_purchase}
                  onChange={handleFilterChange}
                  className="mt-1.5 mb-control mb-select"
                >
                  <option value="">All reviews</option>
                  <option value="true">Verified purchases</option>
                  <option value="false">Not verified</option>
                </select>
              </label>

              <div className="flex gap-2">
                <Button onClick={handleApplyFilters}>
                  Apply filters
                </Button>

                <Button variant="secondary" onClick={handleClearFilters}>
                  Clear
                </Button>
              </div>
            </div>

            <p className="mt-5 text-sm text-muted">
              {reviewPage.count} matching review
              {reviewPage.count === 1 ? "" : "s"} · {reviews.length} on this
              page. Ratings above reflect all approved reviews.
            </p>
            {!reviews.length ? (
              <div className="mt-5 rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
                <h3 className="text-lg font-semibold text-slate-950">
                  {Object.keys(activeFilters).length
                    ? "No reviews match your filters"
                    : "No reviews yet"}
                </h3>
                <p className="mt-2 text-sm text-muted">
                  Reviews will appear here after customers submit feedback.
                </p>
              </div>
            ) : (
              <div className="mt-2 divide-y divide-line">
                {reviews.map((review) => (
                  <article key={review.id} className="py-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold uppercase text-slate-700" aria-hidden="true">
                          {(review.customer_display || "M").slice(0, 1)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{review.customer_display || "MallByte customer"}</p>
                          <p className="text-xs text-muted">{formatDate(review.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {review.is_verified_purchase ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
                            <BadgeCheck size={13} aria-hidden="true" />Verified purchase
                          </span>
                        ) : null}
                        <span
                          className={[
                            "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                            getStatusBadgeClass(review.status),
                          ].join(" ")}
                        >
                          {review.status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <Rating value={review.rating} />
                      <span className="sr-only">{review.rating} / 5 by {review.customer_display || "MallByte customer"}</span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-slate-950">
                      {review.title}
                    </h3>
                    <p className="mt-1.5 max-w-prose text-[0.9375rem] leading-7 text-slate-600">
                      {review.comment}
                    </p>

                    {review.rejected_reason ? (
                      <p className="mt-3 text-sm text-rose-700">
                        Rejection reason: {review.rejected_reason}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
                      <span className="mr-1">Was this helpful?</span>
                      <button
                        type="button"
                        onClick={() => void handleVote(review.id, "helpful")}
                        disabled={votingReviewId === review.id}
                        className="mb-btn mb-btn-secondary mb-btn-sm rounded-full"
                      >
                        <ThumbsUp size={14} aria-hidden="true" />Helpful ({review.helpful_count})
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void handleVote(review.id, "not_helpful")
                        }
                        disabled={votingReviewId === review.id}
                        className="mb-btn mb-btn-secondary mb-btn-sm rounded-full"
                      >
                        <ThumbsDown size={14} aria-hidden="true" />Not helpful ({review.not_helpful_count})
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <nav
              aria-label="Review pages"
              className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-5"
            >
              <button
                type="button"
                disabled={!reviewPage.previous}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="mb-btn mb-btn-secondary mb-btn-sm"
              >
                Previous reviews
              </button>
              <p className="text-sm text-muted">
                Page {page} of {Math.max(1, Math.ceil(reviewPage.count / 20))}
              </p>
              <button
                type="button"
                disabled={!reviewPage.next}
                onClick={() => setPage((value) => value + 1)}
                className="mb-btn mb-btn-secondary mb-btn-sm"
              >
                Next reviews
              </button>
            </nav>
          </>
        ) : null}
      </div>
    </section>
  );
}
