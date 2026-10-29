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
import type { InstallationReport } from "@/hooks/useInstallationReports";

type ReportPhoto = {
  id: number | string;
  file_name: string;
  file_type?: string | null;
  file_tag?: string | null;
  signedUrl: string;
};

type PdfProps = {
  report: InstallationReport;
  photos: ReportPhoto[];
};

type JsonRecord = Record<string, unknown>;

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 50, // Increased to prevent overlapping the absolute footer
    paddingHorizontal: 34,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#263445",
    flexDirection: "column", // Explicit column flex[cite: 1]
  },
  header: {
    flexDirection: "column",
    borderBottomWidth: 1.5,
    borderBottomColor: "#344256",
    paddingBottom: 10,
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 7,
    color: "#738094",
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  title: {
    fontSize: 19,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    color: "#1e293b",
    lineHeight: 1.2, // Explicit safe line-height just for the title
  },
  subtitle: {
    fontSize: 9,
    color: "#64748b",
  },
  metaGrid: {
    flexDirection: "row",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#dce2e9",
    borderRadius: 3,
  },
  metaCell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 9,
    borderRightWidth: 1,
    borderRightColor: "#dce2e9",
  },
  metaLabel: {
    fontSize: 7,
    color: "#738094",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
  },
  section: {
    marginBottom: 13,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    paddingBottom: 5,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#d7dee7",
    color: "#344256",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e8ecf1",
    alignItems: "stretch", // Prevent column clipping[cite: 1]
  },
  label: {
    width: "38%",
    paddingRight: 8,
    color: "#64748b",
  },
  value: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#edf1f5",
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontFamily: "Helvetica-Bold",
    color: "#344256",
    alignItems: "stretch", // Added stretch for table stability[cite: 1]
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e1e6ed",
    alignItems: "stretch", // Added stretch for table stability[cite: 1]
  },
  tableLabel: {
    flex: 1,
    paddingRight: 8,
  },
  tableValue: {
    width: 90,
  },
  note: {
    borderWidth: 1,
    borderColor: "#dce2e9",
    padding: 9,
    borderRadius: 3,
    backgroundColor: "#fafbfd",
  },
  muted: {
    color: "#738094",
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
    height: 300, // Replaced "100%" with a static integer height to prevent total layout collapse
    objectFit: "contain",
  },
  photoLandscape: {
    width: 300,
    height: "100%", // Replaced "100%" with a static integer height to prevent total layout collapse
    objectFit: "contain",
  },
  photoCaption: {
    fontSize: 7,
    marginTop: 4,
    color: "#536174",
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 34,
    right: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#dce2e9",
    paddingTop: 5,
    fontSize: 7,
    color: "#8792a2",
  },
});

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatLabel(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatValue(item)).join(", ") || "—";
  }

  if (isRecord(value)) {
    return Object.entries(value)
      .map(([key, item]) => `${formatLabel(key)}: ${formatValue(item)}`)
      .join("\n");
  }

  return String(value);
}

function hasContent(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;

  if (Array.isArray(value)) {
    return value.some(hasContent);
  }

  if (isRecord(value)) {
    return Object.values(value).some(hasContent);
  }

  return true;
}

// Helper to chunk photos into rows of 3 to avoid flexWrap bugs
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunked = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
}

function DataRows({ data }: { data: JsonRecord }) {
  return (
    <View>
      {Object.entries(data)
        .filter(([, value]) => hasContent(value))
        .map(([key, value]) => (
          <View key={key} style={styles.row} wrap={false}>
            <Text style={styles.label}>{formatLabel(key)}</Text>
            <Text style={styles.value}>{formatValue(value)}</Text>
          </View>
        ))}
    </View>
  );
}

function MeasurementSection({ value }: { value: unknown }) {
  if (!isRecord(value)) {
    return (
      <View style={styles.note}>
        <Text>{formatValue(value)}</Text>
      </View>
    );
  }

  const entries = Object.entries(value).filter(([, item]) => hasContent(item));

  if (!entries.length) {
    return <Text style={styles.muted}>No measurements recorded.</Text>;
  }

  return (
    <View>
      {entries.map(([opening, measurement]) => (
        <View key={opening} style={{ marginBottom: 10 }}>
          <Text
            style={{
              fontFamily: "Helvetica-Bold",
              marginBottom: 4,
            }}
          >
            {formatLabel(opening)}
          </Text>

          {isRecord(measurement) ? (
            <DataRows data={measurement} />
          ) : (
            <View style={styles.row}>
              <Text style={styles.value}>{formatValue(measurement)}</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function InstallationReportPdf({ report, photos }: PdfProps) {
  const details = isRecord(report.details) ? report.details : {};

  const checklist = details.checklist;
  const measurements = details.measurements;
  const notes = details.notes;
  const notApplicable = details.notApplicableOpenings;

  const handledKeys = new Set([
    "checklist",
    "measurements",
    "notes",
    "notApplicableOpenings",
  ]);

  const otherDetails = Object.fromEntries(
    Object.entries(details).filter(
      ([key, value]) => !handledKeys.has(key) && hasContent(value),
    ),
  );

  const imagePhotos = photos.filter((photo) =>
    photo.file_type?.startsWith("image/"),
  );

  const photoRows = chunkArray(imagePhotos, 3);

  return (
    <Document
      title={`Installation Report - Job #${report.job_number}`}
      author="Woodcraft Kitchen Cabinets"
      subject="Installation Report"
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Woodcraft Kitchen Cabinets</Text>
          <Text style={styles.title}>Installation Report</Text>
          <Text style={styles.subtitle}>
            Job # {report.job_number.split("-")[0]}
            {report.address ? `  |  ${report.address}` : ""}
          </Text>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Report ID</Text>
            <Text style={styles.metaValue}>{String(report.id)}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Submitted</Text>
            <Text style={styles.metaValue}>
              {report.created_at
                ? dayjs(report.created_at).format("MMM D, YYYY h:mm A")
                : "—"}
            </Text>
          </View>
          <View style={[styles.metaCell, { borderRightWidth: 0 }]}>
            <Text style={styles.metaLabel}>Submitted By</Text>
            <Text style={styles.metaValue}>{report.submitted_by || "—"}</Text>
          </View>
        </View>

        {isRecord(checklist) && hasContent(checklist) && (
          <Section title="Installation Checklist">
            <View style={styles.tableHeader}>
              <Text style={styles.tableLabel}>Item</Text>
              <Text style={styles.tableValue}>Status</Text>
            </View>
            {Object.entries(checklist).map(([key, value]) => (
              <View key={key} style={styles.tableRow} wrap={false}>
                <Text style={styles.tableLabel}>{formatLabel(key)}</Text>
                <Text style={styles.tableValue}>{formatValue(value)}</Text>
              </View>
            ))}
          </Section>
        )}

        {hasContent(measurements) && (
          <Section title="Measurements">
            <MeasurementSection value={measurements} />
          </Section>
        )}

        {hasContent(notApplicable) && (
          <Section title="Not Applicable Openings">
            <Text>{formatValue(notApplicable)}</Text>
          </Section>
        )}

        {hasContent(notes) && (
          <Section title="Installer Notes">
            <View style={styles.note}>
              <Text>{formatValue(notes)}</Text>
            </View>
          </Section>
        )}

        {Object.keys(otherDetails).length > 0 && (
          <Section title="Additional Details">
            <DataRows data={otherDetails} />
          </Section>
        )}

        {photoRows.length > 0 && (
          <Section title="Photos">
            {photoRows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.photoRow} wrap={false}>
                {row.map((photo, index) => (
                  <View
                    key={photo.id}
                    style={[
                      styles.photoItem,
                      { marginRight: index < 2 ? "2.3%" : 0 },
                    ]}
                  >
                    <Image src={photo.signedUrl} style={styles.photo} />
                    <Text style={styles.photoCaption}>
                      {photo.file_tag || photo.file_name}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </Section>
        )}

        <Text
          fixed
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `WCKC  •  Installation Report #${report.id}    Page ${pageNumber} of ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}
