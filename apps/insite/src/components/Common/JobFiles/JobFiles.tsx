import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { JobOption } from "@/context/JobContext";
import { useJobFiles, JobAttachment } from "@/hooks/useJobFiles";

function getFileBadge(fileName: string) {
  const ext = fileName.split(".").pop()?.toUpperCase() || "FILE";

  switch (ext) {
    case "PDF":
      return {
        label: "PDF",
        bg: "bg-red-100",
        text: "text-red-700",
        border: "border-red-200",
      };
    case "PNG":
    case "JPG":
    case "JPEG":
    case "WEBP":
    case "HEIC":
      return {
        label: ext,
        bg: "bg-purple-100",
        text: "text-purple-700",
        border: "border-purple-200",
      };
    case "XLS":
    case "XLSX":
    case "CSV":
      return {
        label: "XLS",
        bg: "bg-emerald-100",
        text: "text-emerald-700",
        border: "border-emerald-200",
      };
    case "DOC":
    case "DOCX":
      return {
        label: "DOC",
        bg: "bg-blue-100",
        text: "text-blue-700",
        border: "border-blue-200",
      };
    case "ZIP":
    case "RAR":
      return {
        label: "ZIP",
        bg: "bg-amber-100",
        text: "text-amber-700",
        border: "border-amber-200",
      };
    default:
      return {
        label: ext.slice(0, 4),
        bg: "bg-slate-100",
        text: "text-slate-700",
        border: "border-slate-200",
      };
  }
}

interface JobFilesProps {
  selectedJob: JobOption | null;
  category?: string | null;
}

export default function JobFiles({ selectedJob, category }: JobFilesProps) {
  const { files, loading, error } = useJobFiles(selectedJob, category);

  const [isOpen, setIsOpen] = useState(false);

  const handleOpenFile = (file: JobAttachment) => {
    if (!file.file_url) return;

    Linking.openURL(file.file_url).catch((err) => {
      console.error("Could not open file URL:", err);
      Alert.alert("Error", "Could not open this file.");
    });
  };

  return (
    <View className="relative">
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setIsOpen(!isOpen)}
        className="flex-row items-center justify-between rounded-lg border border-slate-200 bg-slate-100 px-3.5 py-5 shadow-sm"
      >
        <Text className="text-xs font-semibold text-slate-700">
          Files ({files.length})
        </Text>

        <Text className="ml-2 text-[10px] text-slate-500">
          {isOpen ? "▲" : "▼"}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/20 justify-center items-center px-6"
          onPress={() => setIsOpen(false)}
        >
          <Pressable
            className="w-full max-h-[380px] rounded-2xl bg-white p-4 shadow-xl border border-slate-100"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center justify-between pb-3 mb-2 border-b border-slate-100">
              <Text className="text-base font-bold text-slate-900">
                Job Attachments
              </Text>

              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                className="rounded-full bg-slate-100 px-2 py-0.5"
              >
                <Text className="text-xs font-bold text-slate-500">✕</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View className="py-8 items-center justify-center">
                <ActivityIndicator size="small" color="#0284c7" />
              </View>
            ) : error ? (
              <View className="py-6 items-center">
                <Text className="text-xs text-red-500">{error}</Text>
              </View>
            ) : files.length === 0 ? (
              <View className="py-8 items-center justify-center">
                <Text className="text-xs font-medium text-slate-400">
                  No attachments found for this job
                </Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {files.map((file) => {
                  const badge = getFileBadge(
                    file.file_name || file.file_path || "file",
                  );

                  return (
                    <View
                      key={file.id}
                      className="flex-row items-center justify-between py-2.5 px-2 rounded-lg border-b border-slate-50"
                    >
                      <TouchableOpacity
                        activeOpacity={0.6}
                        onPress={() => handleOpenFile(file)}
                        className="flex-row items-center flex-1 pr-2"
                      >
                        <View
                          className={`w-10 h-8 items-center justify-center rounded-md border ${badge.bg} ${badge.border}`}
                        >
                          <Text
                            className={`text-[10px] font-extrabold ${badge.text}`}
                          >
                            {badge.label}
                          </Text>
                        </View>

                        <View className="flex-1 ml-2">
                          <Text
                            numberOfLines={1}
                            className="text-sm font-medium text-slate-800"
                          >
                            {file.file_name || "Attachment"}
                          </Text>

                          {file.category && (
                            <Text className="text-[10px] uppercase font-semibold text-slate-400">
                              Added By : {file.category}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>

                      <View className="ml-2">
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handleOpenFile(file)}
                          className="rounded-md bg-slate-100 px-2 py-1.5"
                        >
                          <Text className="text-[11px] font-semibold text-slate-700">
                            View ↗
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
