import Link from "next/link";

type AccessDeniedProps = {
  title?: string;
  description?: string;
};

export function AccessDenied({
  title = "Access denied",
  description = "You do not have permission to view this page.",
}: AccessDeniedProps) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-4 py-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 text-center shadow-sm">
        <p className="mb-eyebrow">
          Permission required
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-3 text-sm text-slate-600">{description}</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="mb-btn mb-btn-primary"
          >
            Back home
          </Link>
          <Link
            href="/profile"
            className="mb-btn mb-btn-secondary"
          >
            View profile
          </Link>
        </div>
      </div>
    </main>
  );
}
