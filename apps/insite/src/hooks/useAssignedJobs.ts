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

  const { data: assignedVariants, error: assignedError } = await supabase
    .from("jobs")
    .select("job_base_number, installation!inner(installer_id)")
    .eq("installation.installer_id", installer.installer_id)
    .eq("is_active", true);

  if (assignedError) throw assignedError;

  if (!assignedVariants?.length) {
    return [];
  }

  const baseNumbers = [
    ...new Set(assignedVariants.map((job) => job.job_base_number)),
  ];

  const { data, error: jobsError } = await supabase
    .from("jobs")
    .select(JOB_DETAILS_SELECT)
    .eq("is_active", true)
    .in("job_base_number", baseNumbers)
    .order("job_number", { ascending: true });

  if (jobsError) throw jobsError;

  return (data ?? []) as unknown as JobOption[];
}
