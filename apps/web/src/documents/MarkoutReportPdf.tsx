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

type Photo = {
  id: number | string;
  file_name: string;
  file_type?: string | null;
  file_tag?: string | null;
  signedUrl: string;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 48,
    paddingHorizontal: 38,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#263445",
  },
  header: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#344256",
    paddingBottom: 12,
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 7,
    color: "#738094",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  title: {
    fontSize: 19,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginBottom: 5,
  },
  address: {
    fontSize: 9,
    color: "#64748b",
  },
  meta: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#dce2e9",
    borderRadius: 3,
    marginBottom: 18,
  },
  cell: {
    flex: 1,
    padding: 9,
    borderRightWidth: 1,
    borderRightColor: "#dce2e9",
  },
  label: {
    fontSize: 7,
    color: "#738094",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  value: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#344256",
    paddingBottom: 6,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#d7dee7",
  },
  note: {
    borderWidth: 1,
    borderColor: "#dce2e9",
    backgroundColor: "#fafbfd",
    borderRadius: 3,
    padding: 11,
    fontSize: 9,
    lineHeight: 1.5,
  },
  photoRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  photoItem: {
    width: "31.8%",
    padding: 5,
    borderWidth: 1,
    borderColor: "#dce2e9",
    borderRadius: 3,
  },
  photo: {
    width: "100%",
    height: 300,
    objectFit: "contain",
  },
  caption: {
    fontSize: 7,
    color: "#536174",
    marginTop: 5,
  },
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

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }

  return result;
}

export function MarkoutReportPdf({
  report,
  photos,
}: {
  report: InsiteReport;
  photos: Photo[];
}) {
  const images = photos.filter((photo) =>
    photo.file_type?.startsWith("image/"),
  );
  const rows = chunks(images, 3);
  const notes = report.details?.notes ?? report.details?.note;

  return (
    <Document
      title={`Markout Report - Job #${report.job_number ?? report.job_id}`}
      author="Woodcraft Kitchen Cabinets"
      subject="Markout Report"
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Woodcraft Kitchen Cabinets</Text>
          <Text style={styles.title}>
            Markout Report - Job #{" "}
            {report.job_number?.split("-")[0] ?? report.job_id}
          </Text>
          <Text style={styles.address}>{report.address ?? ""}</Text>
        </View>

        <View style={styles.meta}>
          <View style={styles.cell}>
            <Text style={styles.label}>Submitted</Text>
            <Text style={styles.value}>
              {report.created_at
                ? dayjs(report.created_at).format("MMM D, YYYY h:mm A")
                : "—"}
            </Text>
          </View>

          <View style={[styles.cell, { borderRightWidth: 0 }]}>
            <Text style={styles.label}>Submitted By</Text>
            <Text style={styles.value}>{report.submitted_by || "—"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Markout Notes</Text>
          <View style={styles.note}>
            <Text>
              {typeof notes === "string" && notes.trim()
                ? notes
                : "No notes recorded."}
            </Text>
          </View>
        </View>

        {rows.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Markout Photos</Text>

            {rows.map((row, rowIndex) => (
              <View
                key={rowIndex}
                style={styles.photoRow}
                wrap={false}
              >
                {row.map((photo, photoIndex) => (
                  <View
                    key={photo.id}
                    style={[
                      styles.photoItem,
                      { marginRight: photoIndex < 2 ? "2.3%" : 0 },
                    ]}
                  >
                    <Image src={photo.signedUrl} style={styles.photo} />
                    <Text style={styles.caption}>
                      {photo.file_tag || photo.file_name}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        <Text
          fixed
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `WCKC  •  Markout Report #${report.id}    Page ${pageNumber} of ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}
