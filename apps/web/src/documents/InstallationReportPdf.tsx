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
import { formatSectionTitle } from "@/utils/installationReportUtils";

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
    paddingBottom: 50,
    paddingHorizontal: 34,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#263445",
    flexDirection: "column",
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
    lineHeight: 1.2,
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
  address: {
    fontSize: 12,
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
    alignItems: "stretch",
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
    alignItems: "stretch",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e1e6ed",
    alignItems: "stretch",
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
    height: 300,
    objectFit: "contain",
  },
  photoLandscape: {
    width: 300,
    height: "100%",
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
      .map(([key, item]) => `${formatSectionTitle(key)}: ${formatValue(item)}`)
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
            <Text style={styles.label}>{formatSectionTitle(key)}</Text>
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
        <Text>{hasContent(value) ? formatValue(value) : "N/A"}</Text>
      </View>
    );
  }

  const entries = Object.entries(value);

  if (!entries.length) {
    return <Text style={styles.muted}>No measurements recorded.</Text>;
  }

  return (
    <View>
      {entries.map(([opening, measurement]) => {
        const isNestedRecord = isRecord(measurement);

        return (
          <View
            key={opening}
            style={{
              flexDirection: isNestedRecord ? "column" : "row",
              marginBottom: 4,
            }}
          >
            <Text
              style={{
                fontFamily: "Helvetica-Bold",
                marginRight: 6,
                marginBottom: isNestedRecord ? 4 : 0,
              }}
            >
              {formatSectionTitle(opening)}:
            </Text>

            {isNestedRecord ? (
              <DataRows data={measurement} />
            ) : (
              <Text style={styles.value}>
                {}
                {hasContent(measurement) ? formatValue(measurement) : "N/A"}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

function Section({
  title,
  children,
  break: shouldBreak,
}: {
  title: string;
  children: React.ReactNode;
  break?: boolean;
}) {
  return (
    <View style={styles.section} break={shouldBreak}>
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
          <Text style={styles.title}>
            Installation Report - Job # {report.job_number.split("-")[0]}
          </Text>
          <Text style={styles.address}>
            {report.address ? `  |  ${report.address}` : ""}
          </Text>
        </View>

        <View style={styles.metaGrid}>
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
                <Text style={styles.tableLabel}>{formatSectionTitle(key)}</Text>
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
          <Section title="Not Applicable">
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
          <Section title="Photos" break={true}>
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
