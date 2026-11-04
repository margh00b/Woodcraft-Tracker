import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useSupabase } from "@/hooks/useSupabase";
import { useAssignedJobs } from "@/hooks/useAssignedJobs";

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

  refreshAssignedJobs: () => Promise<void>;
  isAssignedJobsLoading: boolean;
  assignedJobsError: string | null;

  clearJobState: () => void;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: ReactNode }) {
  const { supabase, user, isLoading: isAuthLoading } = useSupabase();

  const [selectedJob, setSelectedJob] = useState<JobOption | null>(null);
  const [activeJobVariants, setActiveJobVariants] = useState<JobOption[]>([]);

  const [searchResultJob, setSearchResultJob] = useState<JobOption | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [matchingJobs, setMatchingJobs] = useState<JobOption[]>([]);

  const [assignedJobs, setAssignedJobs] = useState<JobOption[]>([]);
  const [isAssignedJobsLoading, setIsAssignedJobsLoading] = useState(true);
  const [assignedJobsError, setAssignedJobsError] = useState<string | null>(
    null,
  );

  const refreshAssignedJobs = useCallback(async () => {
    if (isAuthLoading) return;

    if (!user) {
      setAssignedJobs([]);
      setAssignedJobsError(null);
      setIsAssignedJobsLoading(false);
      return;
    }

    setIsAssignedJobsLoading(true);
    setAssignedJobsError(null);

    try {
      const jobs = await useAssignedJobs(supabase, user);
      setAssignedJobs(jobs);
    } catch (error) {
      console.error("Failed to load assigned jobs:", error);

      setAssignedJobsError(
        error instanceof Error
          ? error.message
          : "Unable to load assigned jobs.",
      );
    } finally {
      setIsAssignedJobsLoading(false);
    }
  }, [supabase, user, isAuthLoading]);

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
        selectedJob,
        setSelectedJob,
        activeJobVariants,
        setActiveJobVariants,
        searchResultJob,
        setSearchResultJob,
        searchQuery,
        setSearchQuery,
        matchingJobs,
        setMatchingJobs,
        assignedJobs,
        setAssignedJobs,
        refreshAssignedJobs,
        isAssignedJobsLoading,
        assignedJobsError,
        clearJobState,
      }}
    >
      {children}
    </JobContext.Provider>
  );
}

export function useJob() {
  const context = useContext(JobContext);

  if (!context) {
    throw new Error("useJob must be used within a JobProvider");
  }

  return context;
}
