import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSupabase } from "@/hooks/useSupabase";
import { useJob } from "@/context/JobContext";
import { KeyboardAwareContainer } from "@/components/Common/KeyboardAwareContainer/KeyboardAwareContainer";
import { PhotoPickerModal } from "@/components/Common/PhotoPicker/PhotoPicker";
import { PhotoGrid } from "../PhotoGrid";
import { MarkoutNotes } from "../MarkoutNotes";
import { usePhotoUploadPipeline } from "@/hooks/usePhotoUploadPipeline";
import { invalidateFormDetailsCache } from "@/hooks/useFormDetails";
import type { PhotoInfo } from "@/types/markout";
import { getErrorMessage } from "@/utils/installReports/photos";

export default function NewMarkout() {
  const router = useRouter();
  const params = useLocalSearchParams<{ jobId?: string }>();
  const { supabase, user } = useSupabase();

  const username =
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Unknown User";

  const parsedJobId = params.jobId ? Number(params.jobId) : undefined;
  const validJobId =
    parsedJobId !== undefined && Number.isFinite(parsedJobId) && parsedJobId > 0
      ? parsedJobId
      : undefined;

  const { selectedJob: contextSelectedJob } = useJob();
  const selectedJob =
    contextSelectedJob?.id === validJobId ? contextSelectedJob : null;

  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<PhotoInfo[]>([]);
  const [photoPickerTarget, setPhotoPickerTarget] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    uploadPhotos,
    commitSuccess,
    rollbackSubmission,
    isUploading,
    uploadProgress,
  } = usePhotoUploadPipeline();

  const scrollViewRef = useRef<ScrollView>(null);

  const handleAddPhotos = useCallback((_target: string, newPhotos: PhotoInfo[]) => {
    setPhotos((previous) => [...previous, ...newPhotos]);
  }, []);

  const handleRemovePhoto = useCallback((photoIndex: number) => {
    setPhotos((previous) => previous.filter((_, index) => index !== photoIndex));
  }, []);

  const handleSubmit = async () => {
    if (isSubmitting || isUploading) return;

    if (!selectedJob) {
      Alert.alert("Error", "Please select a valid job before submitting.");
      return;
    }

    if (photos.length === 0) {
      Alert.alert("Photos Required", "Please upload at least one photo for this markout.");
      return;
    }

    setIsSubmitting(true);
    let activeSubmissionId: string | null = null;

    try {
      const { submissionId, attachments } = await uploadPhotos(
        selectedJob.id,
        "Markout",
        photos.map((photo) => ({ ...photo, tag: "Markout" })),
        { defaultTag: "Markout", category: "Markout" },
      );

      activeSubmissionId = submissionId;

      const { data: markoutId, error: rpcError } = await supabase
        .schema("insite")
        .rpc("submit_markout", {
          p_job_id: selectedJob.id,
          p_details: {
            notes: notes.trim() || null,
          },
          p_submitted_by: username,
          p_idempotency_key: submissionId,
          p_attachments: attachments,
        });

      if (rpcError) {
        throw new Error(`Server failed to submit markout: ${rpcError.message}`);
      }

      if (markoutId == null) {
        throw new Error("Markout was not saved by the server. Please verify.");
      }

      await commitSuccess(submissionId);
      invalidateFormDetailsCache(selectedJob.id, "markouts");

      Alert.alert("Success", "Markout has been successfully submitted.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      if (activeSubmissionId) {
        await rollbackSubmission(activeSubmissionId);
      }
      Alert.alert("Submission Failed", getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = isSubmitting || isUploading;

  return (
    <KeyboardAwareContainer
      ref={scrollViewRef}
      contentContainerStyle={{ paddingBottom: 64 }}
      style={{ flex: 1, backgroundColor: "#f8fafc" }}
    >
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-slate-200">
        <Pressable
          className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200"
          onPress={() => router.back()}
          disabled={isBusy}
        >
          <Text className="text-slate-700 font-medium text-md">← Back</Text>
        </Pressable>
        <Text className="text-lg font-bold text-slate-900">New Markout</Text>
        <View className="w-12" />
      </View>

      <View className="p-5">
        <View className="bg-white p-4 rounded-xl border border-slate-200 mb-5 shadow-sm">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-md font-semibold text-slate-500 uppercase">
              Markout Photos
            </Text>
            <Text className="text-xs font-semibold text-slate-500">
              {photos.length} photo{photos.length === 1 ? "" : "s"}
            </Text>
          </View>
          <Text className="text-sm text-slate-500 mb-4">
            Upload photos showing all markouts for this site.
          </Text>

          <PhotoGrid
            photos={photos}
            onAdd={() => setPhotoPickerTarget("markout")}
            onRemove={handleRemovePhoto}
            disabled={isBusy}
          />
        </View>

        <MarkoutNotes
          value={notes}
          onChange={setNotes}
          disabled={isBusy}
        />

        <Pressable
          className={`w-full py-4 rounded-xl items-center justify-center shadow-sm mt-2 ${
            isBusy ? "bg-slate-400" : "bg-slate-900 active:bg-slate-800"
          }`}
          onPress={handleSubmit}
          disabled={isBusy}
        >
          {isBusy ? (
            <View className="flex-row items-center">
              <ActivityIndicator color="#ffffff" size="small" />
              <Text className="text-white font-bold text-base ml-2">
                Uploading ({uploadProgress.current}/{uploadProgress.total})...
              </Text>
            </View>
          ) : (
            <Text className="text-white font-bold text-base">Submit Markout</Text>
          )}
        </Pressable>
      </View>

      <PhotoPickerModal
        target={photoPickerTarget}
        onClose={() => setPhotoPickerTarget(null)}
        onAddPhotos={handleAddPhotos}
        openings={[{ id: "markout", label: "Markout" }]}
      />
    </KeyboardAwareContainer>
  );
}
