import { useSupabase } from "@/hooks/useSupabase";
import type { JobOption } from "@/context/JobContext";
import { JOB_DETAILS_SELECT } from "@/constants/queries";

type Supabase = ReturnType<typeof useSupabase>["supabase"];
type AuthUser = NonNullable<ReturnType<typeof useSupabase>["user"]>;

export async function useAssignedJobs(
  supabase: Supabase,
  user: AuthUser | null,
): Promise<JobOption[]> {
  if (!user) {
    throw new Error("You must be signed in to view assigned jobs.");
  }

  const { data: installer, error: installerError } = await supabase
    .from("installers")
    .select("installer_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (installerError) throw installerError;

  if (!installer) {
    throw new Error("No installer profile is linked to your account.");
  }

  const { data: assignedJobs, error: assignedError } = await supabase
    .from("jobs")
    .select(
      "job_base_number, installation!fk_installation_id!inner(installer_id)",
    )
    .eq("installation.installer_id", installer.installer_id)
    .eq("is_active", true);

  if (assignedError) throw assignedError;

  const baseNumbers = [
    ...new Set(assignedJobs?.map((job) => job.job_base_number) ?? []),
  ];

  if (!baseNumbers.length) return [];

  const { data: allVariants, error: variantsError } = await supabase
    .from("jobs")
    .select(JOB_DETAILS_SELECT)
    .in("job_base_number", baseNumbers)
    .eq("is_active", true);

  if (variantsError) throw variantsError;

  if (!allVariants?.length) return [];

  const latestDates = new Map<string, number>();

  for (const job of allVariants) {
    const salesOrder = Array.isArray(job.sales_orders)
      ? job.sales_orders[0]
      : job.sales_orders;

    if (!salesOrder?.created_at) continue;

    const createdAt = new Date(salesOrder.created_at).getTime();
    const currentLatest = latestDates.get(job.job_base_number);

    if (currentLatest === undefined || createdAt > currentLatest) {
      latestDates.set(job.job_base_number, createdAt);
    }
  }

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const cutoff = oneYearAgo.getTime();

  const qualifyingBaseNumbers = new Set(
    [...latestDates.entries()]
      .filter(([, latestDate]) => latestDate >= cutoff)
      .map(([baseNumber]) => baseNumber),
  );

  return allVariants
    .filter((job) => qualifyingBaseNumbers.has(job.job_base_number))
    .sort((a, b) =>
      a.job_number.localeCompare(b.job_number),
    ) as unknown as JobOption[];
}
