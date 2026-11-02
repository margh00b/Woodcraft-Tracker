import React, { createContext, useContext, useState, ReactNode } from "react";

export interface JobOption {
  id: number;
  job_number: string;
  sales_orders?: {
    shipping_client_name?: string;
    shipping_street?: string;
    shipping_city?: string;
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
  clearJobState: () => void;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: ReactNode }) {
  // The active job and its full family are the source of truth after selection.
  const [selectedJob, setSelectedJob] = useState<JobOption | null>(null);
  const [activeJobVariants, setActiveJobVariants] = useState<JobOption[]>([]);
  // Dashboard search state is independent and survives workflow navigation.
  const [searchResultJob, setSearchResultJob] = useState<JobOption | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchingJobs, setMatchingJobs] = useState<JobOption[]>([]);
  const [assignedJobs, setAssignedJobs] = useState<JobOption[]>([]);

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
        clearJobState,
        assignedJobs,
        setAssignedJobs,
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
