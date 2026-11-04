import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import dayjs from "dayjs";
import type { InsiteReport } from "@/hooks/useInsiteReports";
import { FLHA_HAZARD_CATEGORIES, FLHA_RATING_LABELS } from "@/utils/flhaReportUtils";

const styles = StyleSheet.create({
  page: { paddingTop: 34, paddingBottom: 48, paddingHorizontal: 38, fontFamily: "Helvetica", fontSize: 9, color: "#263445" },
  header: { borderBottomWidth: 2, borderBottomColor: "#334155", paddingBottom: 12, marginBottom: 16 },
  eyebrow: { fontSize: 8, color: "#64748b", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 5 },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#172033", marginBottom: 5 },
  subtitle: { fontSize: 9, color: "#64748b" },
  meta: { flexDirection: "row", borderWidth: 1, borderColor: "#cbd5e1", marginBottom: 18 },
  metaCell: { flex: 1, padding: 9, borderRightWidth: 1, borderRightColor: "#cbd5e1" },
  metaLabel: { fontSize: 7, color: "#64748b", textTransform: "uppercase", marginBottom: 4 },
  metaValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  section: { marginBottom: 17 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#243247", borderBottomWidth: 1, borderBottomColor: "#cbd5e1", paddingBottom: 6, marginBottom: 7 },
  tableHeader: { flexDirection: "row", backgroundColor: "#e9eef5", padding: 7, fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: "#dce3eb", paddingVertical: 8, paddingHorizontal: 7, alignItems: "center" },
  category: { flex: 1, paddingRight: 10 },
  rating: { width: 105, textAlign: "center", fontFamily: "Helvetica-Bold" },
  note: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 3, padding: 10, minHeight: 42, lineHeight: 1.4 },
  acknowledgement: { borderWidth: 1, borderColor: "#cbd5e1", padding: 11, borderRadius: 3, lineHeight: 1.45 },
  footer: { position: "absolute", bottom: 20, left: 38, right: 38, borderTopWidth: 0.6, borderTopColor: "#cbd5e1", paddingTop: 6, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: "#64748b" },
});

type Props = { report: InsiteReport };

export function FlhaReportPdf({ report }: Props) {
  const details = report.details ?? {};
  const acknowledgement = details.acknowledgement === true;
  const notes = typeof details.notes === "string" ? details.notes.trim() : "";

  return (
    <Document
      title={`FLHA Assessment - Job #${report.job_number ?? report.job_id}`}
      author="Woodcraft Kitchen Cabinets"
      subject="Field Level Hazard Assessment"
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Woodcraft Kitchen Cabinets · Insite Safety Record</Text>
          <Text style={styles.title}>Field Level Hazard Assessment (FLHA)</Text>
          <Text style={styles.subtitle}>
            Job #{report.job_number?.split("-")[0] ?? report.job_id}
            {report.address ? `  |  ${report.address}` : ""}
          </Text>
        </View>

        <View style={styles.meta}>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Assessment date</Text>
            <Text style={styles.metaValue}>
              {report.created_at ? dayjs(report.created_at).format("MMM D, YYYY h:mm A") : "—"}
            </Text>
          </View>
          <View style={[styles.metaCell, { borderRightWidth: 0 }]}>
            <Text style={styles.metaLabel}>Completed by</Text>
            <Text style={styles.metaValue}>{report.submitted_by || "—"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hazard Assessment</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.category}>Hazard category</Text>
            <Text style={styles.rating}>Rating</Text>
          </View>
          {FLHA_HAZARD_CATEGORIES.map((category) => {
            const value = details[category.key];
            const rating = typeof value === "string"
              ? FLHA_RATING_LABELS[value] ?? value
              : "Not recorded";
            return (
              <View key={category.key} style={styles.row} wrap={false}>
                <Text style={styles.category}>{category.label}</Text>
                <Text style={styles.rating}>{rating}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Site Notes / Additional Hazards and Controls</Text>
          <Text style={styles.note}>{notes || "No additional notes recorded."}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Acknowledgement</Text>
          <Text style={styles.acknowledgement}>
            {acknowledgement
              ? "Acknowledged. The submitter confirmed participation in this assessment, understanding of the hazards and controls, confirmation that controls are in place, and agreement to stop and reassess if conditions change."
              : "Not acknowledged. No safety acknowledgement was recorded for this submission."}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Record Information</Text>
          <View style={styles.row}>
            <Text style={styles.category}>Report ID</Text>
            <Text style={styles.rating}>#{report.id}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.category}>Last updated</Text>
            <Text style={styles.rating}>
              {report.updated_at ? dayjs(report.updated_at).format("MMM D, YYYY h:mm A") : "—"}
            </Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>Woodcraft Kitchen Cabinets · Field Level Hazard Assessment</Text>
          <Text>Job #{report.job_number ?? report.job_id} · Report #{report.id}</Text>
        </View>
      </Page>
    </Document>
  );
}
