import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import dayjs from "dayjs";
import type { InsiteReport } from "@/hooks/useInsiteReports";
import type { InsiteReportAttachment } from "@/components/InsiteReports/InsiteReportModal";

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 42,
    paddingHorizontal: 38,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#263445",
  },
  eyebrow: {
    fontSize: 8,
    color: "#738094",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: {
    fontSize: 19,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginBottom: 5,
  },
  subtitle: { fontSize: 9, color: "#64748b", marginBottom: 16 },
  meta: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#dce2e9",
    marginBottom: 18,
  },
  metaCell: { flex: 1, padding: 9 },
  metaLabel: {
    fontSize: 7,
    color: "#738094",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  metaValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#344256",
    borderBottomWidth: 1,
    borderBottomColor: "#d7dee7",
    paddingBottom: 6,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e8ecf1",
  },
  label: { width: "36%", color: "#64748b", paddingRight: 10 },
  value: { flex: 1 },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoItem: {
    width: "31%",
    borderWidth: 1,
    borderColor: "#dce2e9",
    padding: 5,
    marginBottom: 8,
  },
  photo: { width: "100%", height: 145, objectFit: "contain" },
  caption: { fontSize: 7, color: "#536174", marginTop: 4 },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 38,
    right: 38,
    borderTopWidth: 0.5,
    borderTopColor: "#dce2e9",
    paddingTop: 5,
    fontSize: 7,
    color: "#8792a2",
  },
});

function labelFor(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function valueFor(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(valueFor).join(", ") || "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export function InspectionReportPdf({
  report,
  attachments,
}: {
  report: InsiteReport;
  attachments: InsiteReportAttachment[];
}) {
  const imageAttachments = attachments.filter((file) =>
    file.file_type?.startsWith("image/"),
  );

  return (
    <Document
      title={`Inspection Report - Job #${report.job_number ?? report.job_id}`}
      author="Woodcraft Kitchen Cabinets"
      subject="Inspection Report"
    >
      <Page size="LETTER" style={styles.page} wrap>
        <Text style={styles.eyebrow}>Woodcraft Kitchen Cabinets</Text>
        <Text style={styles.title}>
          Inspection Report - Job #{report.job_number ?? report.job_id}
        </Text>
        <Text style={styles.subtitle}>
          {report.address || "Address unavailable"}
        </Text>
        <View style={styles.meta}>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Submitted</Text>
            <Text style={styles.metaValue}>
              {dayjs(report.created_at).format("MMM D, YYYY h:mm A")}
            </Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Submitted by</Text>
            <Text style={styles.metaValue}>{report.submitted_by || "—"}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Report ID</Text>
            <Text style={styles.metaValue}>#{report.id}</Text>
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Inspection details</Text>
          {Object.entries(report.details ?? {}).map(([key, value]) => (
            <View key={key} style={styles.row} wrap={false}>
              <Text style={styles.label}>{labelFor(key)}</Text>
              <Text style={styles.value}>{valueFor(value)}</Text>
            </View>
          ))}
          {Object.keys(report.details ?? {}).length === 0 && (
            <Text>No additional details recorded.</Text>
          )}
        </View>

        {imageAttachments.length > 0 && (
          <View style={{ marginTop: 18 }}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <View style={styles.photos}>
              {imageAttachments.map((file) => (
                <View key={file.id} style={styles.photoItem} wrap={false}>
                  <Image src={file.signedUrl} style={styles.photo} />
                  <Text style={styles.caption}>
                    {file.file_tag || file.file_name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text
          fixed
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `WCKC  •  Inspection Report #${report.id}    Page ${pageNumber} of ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}
