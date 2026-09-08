"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/features/auth/auth-store";
import { getApiErrorMessage } from "@/lib/api/errors";

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
  return new Date(value).toLocaleString();
}

function getStatusBadgeClass(status: string) {
  if (status === "approved") {
    return "bg-green-100 text-green-700";
  }

  if (status === "rejected") {
    return "bg-red-100 text-red-700";
  }

  if (status === "hidden") {
    return "bg-slate-100 text-slate-700";
  }

  return "bg-yellow-100 text-yellow-700";
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
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [summary, setSummary] = useState<ProductReviewSummary | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [activeFilters, setActiveFilters] = useState<ProductReviewFilters>({});
  const [form, setForm] = useState<ReviewFormState>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [votingReviewId, setVotingReviewId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function refreshReviews(filters: ProductReviewFilters = activeFilters) {
    const [summaryData, reviewsData] = await Promise.all([
      getProductReviewSummary(productId),
      getProductReviews(productId, filters),
    ]);

    setSummary(summaryData);
    setReviews(reviewsData);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadReviewData() {
      setIsLoading(true);
      setError("");

      try {
        const [summaryData, reviewsData] = await Promise.all([
          getProductReviewSummary(productId),
          getProductReviews(productId, activeFilters),
        ]);

        if (isMounted) {
          setSummary(summaryData);
          setReviews(reviewsData);
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
  }, [activeFilters, productId]);

  function handleFilterChange(event: ChangeEvent<HTMLSelectElement>) {
    const { name, value } = event.target;

    setDraftFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleApplyFilters() {
    setActiveFilters(buildFilters(draftFilters));
  }

  function handleClearFilters() {
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
      await refreshReviews(activeFilters);
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

      setReviews((current) => updateReviewInList(current, updatedReview));
    } catch (voteError) {
      setFormError(getApiErrorMessage(voteError));
    } finally {
      setVotingReviewId(null);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            Reviews
          </p>

          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Customer reviews
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Read customer feedback, filter reviews, and leave your own review
            after a delivered order.
          </p>
        </div>

        {summary ? (
          <div className="rounded-2xl bg-slate-50 px-5 py-4 text-right">
            <p className="text-3xl font-semibold text-slate-950">
              {summary.average_rating}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {summary.reviews_count} review
              {summary.reviews_count === 1 ? "" : "s"}
            </p>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-500">Loading reviews...</p>
      ) : null}

      {!isLoading && error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!isLoading && !error ? (
        <>
          {summary ? (
            <div className="mt-8 grid gap-3 sm:grid-cols-5">
              {(["5", "4", "3", "2", "1"] as const).map((rating) => (
                <div
                  key={rating}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <p className="text-sm font-semibold text-slate-950">
                    {rating} star
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {summary.rating_breakdown[rating]}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-8 rounded-3xl border border-slate-200 p-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Rating filter
                </span>
                <select
                  name="rating"
                  value={draftFilters.rating}
                  onChange={handleFilterChange}
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400"
                >
                  <option value="">All ratings</option>
                  <option value="5">5 stars</option>
                  <option value="4">4 stars</option>
                  <option value="3">3 stars</option>
                  <option value="2">2 stars</option>
                  <option value="1">1 star</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Verified filter
                </span>
                <select
                  name="is_verified_purchase"
                  value={draftFilters.is_verified_purchase}
                  onChange={handleFilterChange}
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400"
                >
                  <option value="">All reviews</option>
                  <option value="true">Verified purchases</option>
                  <option value="false">Not verified</option>
                </select>
              </label>

              <button
                type="button"
                onClick={handleApplyFilters}
                className="h-11 rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Apply filters
              </button>

              <button
                type="button"
                onClick={handleClearFilters}
                className="h-11 rounded-2xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Clear
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSubmitReview}
            className="mt-8 rounded-3xl border border-slate-200 p-5"
          >
            <h3 className="text-lg font-semibold text-slate-950">
              Write a review
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Reviews are submitted for moderation. The backend only accepts
              reviews for delivered orders.
            </p>

            {formError ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            ) : null}

            {successMessage ? (
              <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {successMessage}
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Review rating
                </span>
                <select
                  name="rating"
                  value={form.rating}
                  onChange={handleFormChange}
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400"
                >
                  <option value="5">5 stars</option>
                  <option value="4">4 stars</option>
                  <option value="3">3 stars</option>
                  <option value="2">2 stars</option>
                  <option value="1">1 star</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Review title
                </span>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  required
                  maxLength={120}
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  Review comment
                </span>
                <textarea
                  name="comment"
                  value={form.comment}
                  onChange={handleFormChange}
                  required
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-5 h-11 rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit review"}
            </button>
          </form>

          <div className="mt-8">
            {!reviews.length ? (
              <div className="rounded-3xl border border-dashed border-slate-300 p-6">
                <h3 className="text-lg font-semibold text-slate-950">
                  No reviews yet
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Reviews will appear here after customers submit feedback.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-3xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-950">
                            {review.title}
                          </h3>

                          <span
                            className={[
                              "rounded-full px-3 py-1 text-xs font-medium capitalize",
                              getStatusBadgeClass(review.status),
                            ].join(" ")}
                          >
                            {review.status}
                          </span>

                          {review.is_verified_purchase ? (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                              Verified purchase
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          {review.rating} / 5 by{" "}
                          {review.customer_display || "MallByte customer"}
                        </p>
                      </div>

                      <p className="text-xs text-slate-500">
                        {formatDate(review.created_at)}
                      </p>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      {review.comment}
                    </p>

                    {review.rejected_reason ? (
                      <p className="mt-3 text-sm text-red-600">
                        Rejection reason: {review.rejected_reason}
                      </p>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void handleVote(review.id, "helpful")}
                        disabled={votingReviewId === review.id}
                        className="h-10 rounded-2xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Helpful ({review.helpful_count})
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void handleVote(review.id, "not_helpful")
                        }
                        disabled={votingReviewId === review.id}
                        className="h-10 rounded-2xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Not helpful ({review.not_helpful_count})
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}
