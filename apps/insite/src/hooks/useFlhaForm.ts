import { useState, useCallback } from "react";
import {
  HazardRating,
  DEFAULT_HAZARD_RATINGS,
} from "@/components/Flha/flha.constants";

interface UseFlhaFormOptions {
  initialRatings?: Record<string, HazardRating>;
  initialNotes?: string;
  initialAcknowledgement?: boolean;
}

export function useFlhaForm(options: UseFlhaFormOptions = {}) {
  const [hazardRatings, setHazardRatings] = useState<
    Record<string, HazardRating>
  >(options.initialRatings ?? { ...DEFAULT_HAZARD_RATINGS });

  const [notes, setNotes] = useState(options.initialNotes ?? "");
  const [acknowledgement, setAcknowledgement] = useState(
    options.initialAcknowledgement ?? false,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingChange = useCallback(
    (categoryKey: string, rating: HazardRating) => {
      setHazardRatings((prev) => ({
        ...prev,
        [categoryKey]: rating,
      }));
    },
    [],
  );

  const toggleAcknowledgement = useCallback(() => {
    setAcknowledgement((prev) => !prev);
  }, []);

  const buildHazardsPayload = useCallback(() => {
    return {
      ...hazardRatings,
      notes: notes.trim() || null,
    };
  }, [hazardRatings, notes]);

  const hydrateFromRecord = useCallback(
    (record: { hazards?: any; acknowledgement?: boolean }) => {
      if (record.hazards) {
        const { notes: existingNotes, ...restHazards } = record.hazards;
        setHazardRatings((prev) => ({ ...prev, ...restHazards }));
        setNotes(existingNotes || "");
      }
      setAcknowledgement(record.acknowledgement ?? false);
    },
    [],
  );

  return {
    hazardRatings,
    notes,
    setNotes,
    acknowledgement,
    isSubmitting,
    setIsSubmitting,
    handleRatingChange,
    toggleAcknowledgement,
    buildHazardsPayload,
    hydrateFromRecord,
  };
}
