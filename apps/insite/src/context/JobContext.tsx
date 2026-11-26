import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useSupabase } from "@/hooks/useSupabase";
import { useAssignedJobs, type MarkoutTab } from "@/hooks/useAssignedJobs";

export interface JobOption {
  id: number;
  job_number: string;
  job_base_number: string;
  job_suffix: string | null;
  sales_orders?: {
    shipping_client_name?: string;
    shipping_street?: string;
    shipping_city?: string;
    sitesuper_email?: string | null;
    markout_date?: string | null;
    second_markout_date?: string | null;
  } | null;
}

interface JobContextType {
  selectedJob: JobOption | null;
  setSelectedJob: (job: JobOption | null) => void;
  activeJobVariants: JobOption[];
  setActiveJobVariants: (jobs: JobOption[]) => void;
  searchResultJob: JobOption | null;
  setSearchResultJob: (job: JobOption | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  matchingJobs: JobOption[];
  setMatchingJobs: (jobs: JobOption[]) => void;
  assignedJobs: JobOption[];
  setAssignedJobs: (jobs: JobOption[]) => void;
  refreshAssignedJobs: (tab?: MarkoutTab) => Promise<void>;
  loadMoreAssignedJobs: () => Promise<void>;
  hasMoreAssignedJobs: boolean;
  isLoadingMoreAssignedJobs: boolean;
  isAssignedJobsLoading: boolean;
  assignedJobsError: string | null;
  clearJobState: () => void;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: ReactNode }) {
  const { supabase, user, isLoading: isAuthLoading } = useSupabase();
  const role = user?.app_metadata?.role;
  const canLoadAssignedJobs = role === "installer" || role === "markouts";

  const [selectedJob, setSelectedJob] = useState<JobOption | null>(null);
  const [activeJobVariants, setActiveJobVariants] = useState<JobOption[]>([]);
  const [searchResultJob, setSearchResultJob] = useState<JobOption | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchingJobs, setMatchingJobs] = useState<JobOption[]>([]);
  const [assignedJobs, setAssignedJobs] = useState<JobOption[]>([]);
  const [isAssignedJobsLoading, setIsAssignedJobsLoading] = useState(true);
  const [isLoadingMoreAssignedJobs, setIsLoadingMoreAssignedJobs] = useState(false);
  const [hasMoreAssignedJobs, setHasMoreAssignedJobs] = useState(false);
  const [assignedJobsError, setAssignedJobsError] = useState<string | null>(null);
  const [markoutTab, setMarkoutTab] = useState<MarkoutTab>("Today");
  const [assignedJobsOffset, setAssignedJobsOffset] = useState(0);

  const refreshAssignedJobs = useCallback(async (tab: MarkoutTab = "Today") => {
    if (isAuthLoading) return;
    setMarkoutTab(tab);
    setAssignedJobsOffset(0);
    if (!user || !canLoadAssignedJobs) {
      setAssignedJobs([]);
      setHasMoreAssignedJobs(false);
      setAssignedJobsError(null);
      setIsAssignedJobsLoading(false);
      return;
    }

    setIsAssignedJobsLoading(true);
    setAssignedJobsError(null);
    try {
      const page = await useAssignedJobs(supabase, user, { markoutTab: tab, offset: 0 });
      setAssignedJobs(page.jobs);
      setHasMoreAssignedJobs(page.hasMore);
    } catch (error) {
      console.error("Failed to load assigned jobs:", error);
      setAssignedJobsError(
        error instanceof Error ? error.message : "Unable to load assigned jobs.",
      );
    } finally {
      setIsAssignedJobsLoading(false);
    }
  }, [supabase, user, isAuthLoading, canLoadAssignedJobs]);

  const loadMoreAssignedJobs = useCallback(async () => {
    if (role !== "markouts" || !user || isLoadingMoreAssignedJobs || !hasMoreAssignedJobs) return;
    setIsLoadingMoreAssignedJobs(true);
    setAssignedJobsError(null);
    const nextOffset = assignedJobsOffset + 30;
    try {
      const page = await useAssignedJobs(supabase, user, {
        markoutTab,
        offset: nextOffset,
      });
      setAssignedJobs((current) => [...current, ...page.jobs]);
      setAssignedJobsOffset(nextOffset);
      setHasMoreAssignedJobs(page.hasMore);
    } catch (error) {
      console.error("Failed to load more markouts:", error);
      setAssignedJobsError(
        error instanceof Error ? error.message : "Unable to load more markouts.",
      );
    } finally {
      setIsLoadingMoreAssignedJobs(false);
    }
  }, [role, user, isLoadingMoreAssignedJobs, hasMoreAssignedJobs, assignedJobsOffset, supabase, markoutTab]);

  useEffect(() => {
    void refreshAssignedJobs();
  }, [refreshAssignedJobs]);

  const clearJobState = () => {
    setSearchResultJob(null);
    setSearchQuery("");
    setMatchingJobs([]);
  };

  return (
    <JobContext.Provider
      value={{
        selectedJob, setSelectedJob, activeJobVariants, setActiveJobVariants,
        searchResultJob, setSearchResultJob, searchQuery, setSearchQuery,
        matchingJobs, setMatchingJobs, assignedJobs, setAssignedJobs,
        refreshAssignedJobs, loadMoreAssignedJobs, hasMoreAssignedJobs,
        isLoadingMoreAssignedJobs, isAssignedJobsLoading, assignedJobsError, clearJobState,
      }}
    >
      {children}
    </JobContext.Provider>
  );
}

export function useJob() {
  const context = useContext(JobContext);
  if (!context) throw new Error("useJob must be used within a JobProvider");
  return context;
}
