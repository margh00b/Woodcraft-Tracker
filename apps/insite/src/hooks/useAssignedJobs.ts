import { useSupabase } from "@/hooks/useSupabase";
import type { JobOption } from "@/context/JobContext";
import { JOB_DETAILS_SELECT, INSPECTION_JOB_DETAILS_SELECT } from "@/constants/queries";

type Supabase = ReturnType<typeof useSupabase>["supabase"];
type AuthUser = NonNullable<ReturnType<typeof useSupabase>["user"]>;
export type MarkoutTab = "Today" | "This Week" | "All";
export type ScheduledJobsTab = MarkoutTab;

const MARKOUT_PAGE_SIZE = 30;

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export async function useAssignedJobs(
  supabase: Supabase,
  user: AuthUser | null,
  options: { markoutTab?: MarkoutTab; offset?: number } = {},
): Promise<{ jobs: JobOption[]; hasMore: boolean }> {
  if (!user) throw new Error("You must be signed in to view assigned jobs.");

  const role = user.app_metadata?.role;

  if (role === "markouts") {
    const tab = options.markoutTab ?? "Today";
    const offset = options.offset ?? 0;
    let query = supabase
      .from("jobs")
      .select(JOB_DETAILS_SELECT, { count: "exact" })
      .eq("is_active", true);

    if (tab === "Today") {
      const today = dateKey(new Date());
      query = query.or(`markout_date.eq.${today},second_markout_date.eq.${today}`, {
        referencedTable: "sales_orders",
      });
    } else if (tab === "This Week") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const startKey = dateKey(start);
      const endKey = dateKey(end);
      query = query.or(
        `and(markout_date.gte.${startKey},markout_date.lt.${endKey}),and(second_markout_date.gte.${startKey},second_markout_date.lt.${endKey})`,
        { referencedTable: "sales_orders" },
      );
    } else {
      query = query.or("markout_date.not.is.null,second_markout_date.not.is.null", {
        referencedTable: "sales_orders",
      });
    }

    const { data, error, count } = await query
      .order("id", { ascending: true })
      .range(offset, offset + MARKOUT_PAGE_SIZE - 1);

    if (error) throw error;
    return {
      jobs: (data ?? []) as unknown as JobOption[],
      hasMore: (count ?? 0) > offset + (data?.length ?? 0),
    };
  }

  if (role === "inspection") {
    const tab = options.markoutTab ?? "Today";
    const offset = options.offset ?? 0;
    let query = supabase
      .from("jobs")
      .select(INSPECTION_JOB_DETAILS_SELECT, { count: "exact" })
      .eq("is_active", true);

    if (tab === "Today") {
      const today = dateKey(new Date());
      query = query.or(`inspection_date.eq.${today}`, {
        referencedTable: "installation",
      });
    } else if (tab === "This Week") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      query = query.or(
        `and(inspection_date.gte.${dateKey(start)},inspection_date.lt.${dateKey(end)})`,
        { referencedTable: "installation" },
      );
    } else {
      query = query.or("inspection_date.not.is.null", {
        referencedTable: "installation",
      });
    }

    const { data, error, count } = await query
      .order("id", { ascending: true })
      .range(offset, offset + MARKOUT_PAGE_SIZE - 1);

    if (error) throw error;
    return {
      jobs: (data ?? []) as unknown as JobOption[],
      hasMore: (count ?? 0) > offset + (data?.length ?? 0),
    };
  }

  if (role !== "installer") return { jobs: [], hasMore: false };

  const { data: installer, error: installerError } = await supabase
    .from("installers")
    .select("installer_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (installerError) throw installerError;
  if (!installer) throw new Error("No installer profile is linked to your account.");

  const { data: assignedJobs, error: assignedError } = await supabase
    .from("jobs")
    .select("job_base_number, installation!fk_installation_id!inner(installer_id)")
    .eq("installation.installer_id", installer.installer_id)
    .eq("is_active", true);

  if (assignedError) throw assignedError;

  const baseNumbers = [...new Set(assignedJobs?.map((job) => job.job_base_number) ?? [])];
  if (!baseNumbers.length) return { jobs: [], hasMore: false };

  const { data: allVariants, error: variantsError } = await supabase
    .from("jobs")
    .select(JOB_DETAILS_SELECT)
    .in("job_base_number", baseNumbers)
    .eq("is_active", true);

  if (variantsError) throw variantsError;
  if (!allVariants?.length) return { jobs: [], hasMore: false };

  const latestDates = new Map<string, number>();
  for (const job of allVariants) {
    const salesOrder = Array.isArray(job.sales_orders) ? job.sales_orders[0] : job.sales_orders;
    if (!salesOrder?.created_at) continue;
    const createdAt = new Date(salesOrder.created_at).getTime();
    const currentLatest = latestDates.get(job.job_base_number);
    if (currentLatest === undefined || createdAt > currentLatest) {
      latestDates.set(job.job_base_number, createdAt);
    }
  }

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const qualifyingBaseNumbers = new Set(
    [...latestDates.entries()]
      .filter(([, latestDate]) => latestDate >= oneYearAgo.getTime())
      .map(([baseNumber]) => baseNumber),
  );

  const jobs = allVariants
    .filter((job) => qualifyingBaseNumbers.has(job.job_base_number))
    .sort((a, b) => a.job_number.localeCompare(b.job_number)) as unknown as JobOption[];
  return { jobs, hasMore: false };
}
