import { createHash } from "crypto";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import capitalize from "@/utils/capitalize";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Markout Report | Woodcraft Kitchen Cabinets",
  robots: {
    index: false,
    follow: false,
  },
  referrer: "no-referrer",
};

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function ExternalMarkoutPage({ params }: PageProps) {
  const { token } = await params;

  if (!/^[a-f0-9]{64}$/.test(token)) {
    notFound();
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const supabase = createAdminClient();

  const { data: share, error: shareError } = await supabase
    .schema("insite")
    .from("markout_share_tokens")
    .select("markout_id, expires_at")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (shareError || !share) {
    notFound();
  }

  const { data: markout, error: markoutError } = await supabase
    .schema("insite")
    .from("markouts")
    .select("id, job_id, details, submitted_by, created_at")
    .eq("id", share.markout_id)
    .maybeSingle();

  if (markoutError || !markout) {
    notFound();
  }

  // Get the job and its associated sales order ID.
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("job_base_number, sales_order_id")
    .eq("id", markout.job_id)
    .maybeSingle();

  if (jobError || !job) {
    notFound();
  }

  // Get the project address from the associated sales order.
  const { data: salesOrder, error: salesOrderError } = await supabase
    .from("sales_orders")
    .select("shipping_street, shipping_city, shipping_province, shipping_zip")
    .eq("id", job.sales_order_id)
    .maybeSingle();

  if (salesOrderError || !salesOrder) {
    notFound();
  }

  // Format the complete address.
  const address = [
    salesOrder.shipping_street,
    salesOrder.shipping_city,
    salesOrder.shipping_province,
    salesOrder.shipping_zip,
  ]
    .filter(Boolean)
    .join(", ");
  const { data: attachments, error: attachmentError } = await supabase
    .from("job_attachments")
    .select("id, file_name, file_path, file_type")
    .eq("markout_id", markout.id)
    .order("created_at", { ascending: true });

  if (attachmentError) {
    throw new Error("Unable to load markout attachments.");
  }

  const photos = await Promise.all(
    (attachments ?? []).map(async (attachment) => {
      const { data, error } = await supabase.storage
        .from("job_files")
        .createSignedUrl(attachment.file_path, 10 * 60);

      if (error || !data?.signedUrl) {
        return null;
      }

      return {
        id: attachment.id,
        name: attachment.file_name,
        type: attachment.file_type,
        url: data.signedUrl,
      };
    }),
  );

  const validPhotos = photos.filter(
    (photo): photo is NonNullable<typeof photo> => photo !== null,
  );

  const details = markout.details as { notes?: string | null } | null;
  const notes = details?.notes?.trim();

  return (
    <main className="min-h-screen bg-[#f5f6f8] px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between border-b border-slate-200 pb-6">
          <div>
            <p className="text-xl font-bold tracking-tight text-slate-900">
              WOODCRAFT
            </p>
            <p className="text-xs font-medium tracking-[0.35em] text-slate-500">
              KITCHEN CABINETS
            </p>
          </div>

          <div className="hidden h-1 w-32 rounded-full bg-purple-500 sm:block" />
        </header>

        {/* Report Banner */}
        <section className="relative mb-8 overflow-hidden rounded-2xl bg-slate-900 px-6 py-10 text-white shadow-lg sm:px-10 sm:py-12">
          <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="relative">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Markout Report
            </h1>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-purple-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 21s7-5.5 7-12a7 7 0 1 0-14 0c0 6.5 7 12 7 12Z"
                    />
                    <circle cx="12" cy="9" r="2.5" />
                  </svg>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Project Address</p>
                  <p className="font-semibold text-white">
                    {address || "Address not available"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-purple-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 8h8M8 12h8M8 16h4"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Job Reference</p>
                  <p className="text-lg font-semibold text-white">
                    {job.job_base_number}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Report Details */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Report Details</h2>
            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-purple-700">
              Markout
            </span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 21v-2a7 7 0 0 1 14 0v2"
                  />
                </svg>
              </div>

              <div>
                <p className="text-sm text-slate-500">Submitted By</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {capitalize(markout.submitted_by) || "Not specified"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 border-slate-100 sm:border-l sm:pl-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 3v4M8 3v4M3 10h18"
                  />
                </svg>
              </div>

              <div>
                <p className="text-sm text-slate-500">Submitted On</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {new Date(markout.created_at).toLocaleString("en-CA", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "America/Edmonton",
                  })}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="mb-8 rounded-2xl border border-purple-100 bg-purple-50/70 p-6 sm:p-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
                />
              </svg>
            </div>

            <h2 className="text-sm font-bold uppercase tracking-widest text-purple-800">
              Notes
            </h2>
          </div>

          <p className="whitespace-pre-wrap pl-1 leading-7 text-slate-800">
            {notes || "No notes were provided."}
          </p>
        </section>
        {/* Photos */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Attachments
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Markout Photos
              </h2>
            </div>

            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
              {validPhotos.length}{" "}
              {validPhotos.length === 1 ? "Photo" : "Photos"}
            </span>
          </div>

          {validPhotos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
              <p className="text-sm text-slate-500">
                No photos are currently available.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {validPhotos.map((photo, index) => (
                <figure
                  key={photo.id}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                >
                  <a
                    href={photo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-56 max-h-105 items-center justify-center overflow-hidden bg-slate-100"
                  >
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className="max-h-105 max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </a>

                  <figcaption className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
                    <span className="shrink-0 text-xs font-semibold text-slate-400">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-10 border-t border-slate-200 py-6 text-center">
          <p className="text-sm font-semibold tracking-wide text-slate-500">
            Woodcraft Kitchen Cabinets
          </p>
          <p className="mt-1 text-xs text-slate-400">Private Markout Report</p>
        </footer>
      </div>
    </main>
  );
}
