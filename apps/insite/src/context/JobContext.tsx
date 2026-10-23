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
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  matchingJobs: JobOption[];
  setMatchingJobs: (jobs: JobOption[]) => void;
  clearJobState: () => void;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: ReactNode }) {
  const [selectedJob, setSelectedJob] = useState<JobOption | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchingJobs, setMatchingJobs] = useState<JobOption[]>([]);

  const clearJobState = () => {
    setSelectedJob(null);
    setSearchQuery("");
    setMatchingJobs([]);
  };

  return (
    <JobContext.Provider
      value={{
        selectedJob,
        setSelectedJob,
        searchQuery,
        setSearchQuery,
        matchingJobs,
        setMatchingJobs,
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
