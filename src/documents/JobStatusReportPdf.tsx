import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);
import { Views } from "@/types/db";

export type JobStatusJob = Views<"job_status_report_view">;

const ITEMS_PER_PAGE = 30;
const BORDER_COLOR = "#e0e0e0";
const HEADER_BORDER_COLOR = "#000";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 9,
    flexDirection: "column",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    paddingBottom: 5,
    height: 40,
  },
  reportTitle: { fontSize: 18, fontWeight: "bold" },
  periodText: { fontSize: 14, fontWeight: "bold" },
  metaInfo: { fontSize: 8, textAlign: "right" },

  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    backgroundColor: "#f8f9fa",
    alignItems: "stretch",
    marginTop: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER_COLOR,
    alignItems: "stretch",
  },

  cellBase: {
    paddingVertical: 3,
    paddingHorizontal: 2,
    borderRightWidth: 0.5,
    borderRightColor: BORDER_COLOR,
    justifyContent: "center",
  },
  headerCellBase: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderRightWidth: 0.5,
    borderRightColor: HEADER_BORDER_COLOR,
    justifyContent: "center",
    backgroundColor: "#d1d1d1ff",
  },

  colJob: { width: "8%", fontWeight: "bold" },
  colClient: { width: "15%" },
  colAddress: { width: "20%" },
  colShipDate: { width: "8%", alignItems: "center" },
  colShipped: { width: "6%", alignItems: "center" },
  colInstallDate: { width: "8%", alignItems: "center" },
  colInstallComp: { width: "8%", alignItems: "center" },
  colInspDate: { width: "8%", alignItems: "center" },
  colInspComp: { width: "8%", alignItems: "center" },
  colFinalDate: { width: "8%", alignItems: "center" },
  colSO: { width: "5%", alignItems: "center", borderRightWidth: 0 },

  headerText: { fontSize: 8, fontWeight: "bold", textAlign: "center" },
  cellText: { fontSize: 8 },
  cellTextSmall: { fontSize: 7 },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 8,
    color: "#888",
  },
});

const safeGet = (data: any) => {
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
};

const formatDate = (date: string | null) => {
  if (!date) return "—";
  const d = dayjs.utc(date);
  return d.isValid() ? d.format("MMM D, YYYY") : "—";
};

const truncate = (str: string | null, len: number) => {
  if (!str) return "";
  return str.length > len ? str.substring(0, len) + "..." : str;
};

const getReportingPeriod = (start: Date | null, end: Date | null) => {
  if (!start || !end) return "Unknown Period";
  const s = dayjs(start);
  const e = dayjs(end);

  if (s.isSame(e, "month") && s.isSame(e, "year")) {
    return s.format("MMMM YYYY");
  }
  return `${s.format("MMMM YYYY")} - ${e.format("MMMM YYYY")}`;
};

const ColumnHeaders = () => (
  <View style={styles.tableHeader}>
    <View style={[styles.headerCellBase, styles.colJob]}>
      <Text style={styles.headerText}>Job #</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colClient]}>
      <Text style={styles.headerText}>Client</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colAddress]}>
      <Text style={styles.headerText}>Address</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colShipDate]}>
      <Text style={styles.headerText}>Ship Date</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colShipped]}>
      <Text style={styles.headerText}>Shipped</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colInstallDate]}>
      <Text style={styles.headerText}>Install Date</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colInstallComp]}>
      <Text style={styles.headerText}>Install Comp</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colInspDate]}>
      <Text style={styles.headerText}>Inspection Date</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colInspComp]}>
      <Text style={styles.headerText}>Inspection Comp</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colFinalDate]}>
      <Text style={styles.headerText}>Cabinet Finals</Text>
    </View>
    <View style={[styles.headerCellBase, styles.colSO]}>
      <Text style={styles.headerText}>Service Orders</Text>
    </View>
  </View>
);

export type JobStatusReportPdfProps = {
  data: JobStatusJob[];
  startDate: Date | null;
  endDate: Date | null;
};

export const JobStatusReportPdf = ({
  data,
  startDate,
  endDate,
}: JobStatusReportPdfProps) => {
  const pages: React.ReactNode[][] = [];
  let currentPage: React.ReactNode[] = [];
  let currentCount = 0;

  const startNewPage = () => {
    if (currentPage.length > 0) pages.push(currentPage);
    currentPage = [];
    currentCount = 0;
  };

  currentPage.push(<ColumnHeaders key="header-main" />);
  currentCount += 1;

  data.forEach((job) => {
    const address =
      [job.shipping_street, job.shipping_city].filter(Boolean).join(", ") ||
      "—";

    if (currentCount >= ITEMS_PER_PAGE) {
      startNewPage();
      currentPage.push(<ColumnHeaders key={`header-${job.job_id}`} />);
      currentCount += 1;
    }

    currentPage.push(
      <View style={styles.tableRow} key={String(job.job_id)} wrap={false}>
        <View style={[styles.cellBase, styles.colJob]}>
          <Text style={[styles.cellText]}>{String(job.job_number || "")}</Text>
        </View>
        <View style={[styles.cellBase, styles.colClient]}>
          <Text style={styles.cellText}>
            {truncate(job.shipping_client_name || "Unknown", 25)}
          </Text>
        </View>
        <View style={[styles.cellBase, styles.colAddress]}>
          <Text style={styles.cellTextSmall}>{truncate(address, 40)}</Text>
        </View>
        <View style={[styles.cellBase, styles.colShipDate]}>
          <Text style={styles.cellText}>
            {formatDate(job.ship_schedule || null)}
          </Text>
        </View>
        <View
          style={[
            styles.cellBase,
            styles.colShipped,
            job.has_shipped
              ? { backgroundColor: "#e3ffeaff" }
              : { backgroundColor: "#ffcbcbff" },
          ]}
        >
          <Text style={[styles.cellText]}>
            {job.has_shipped ? "Yes" : "No"}
          </Text>
        </View>
        <View style={[styles.cellBase, styles.colInstallDate]}>
          <Text style={styles.cellText}>
            {formatDate(job.installation_date || null)}
          </Text>
        </View>
        <View style={[styles.cellBase, styles.colInstallComp]}>
          <Text style={styles.cellText}>
            {formatDate(job.installation_completed || null)}
          </Text>
        </View>
        <View style={[styles.cellBase, styles.colInspDate]}>
          <Text style={styles.cellText}>
            {formatDate(job.inspection_date || null)}
          </Text>
        </View>
        <View style={[styles.cellBase, styles.colInspComp]}>
          <Text style={styles.cellText}>
            {formatDate(job.inspection_completed || null)}
          </Text>
        </View>
        <View style={[styles.cellBase, styles.colFinalDate]}>
          <Text style={styles.cellText}>{}—</Text>
        </View>
        <View style={[styles.cellBase, styles.colSO]}>
          <Text style={styles.cellText}>
            {String(job.service_order_count || 0)}
          </Text>
        </View>
      </View>,
    );

    currentCount += 1;
  });

  if (currentPage.length > 0) pages.push(currentPage);

  if (pages.length === 0) {
    return (
      <Document>
        <Page size="A4" orientation="landscape" style={styles.page}>
          <View style={styles.headerContainer} fixed>
            <Text style={styles.reportTitle}>Job Status Report</Text>
            <Text style={styles.periodText}>
              {getReportingPeriod(startDate, endDate)}
            </Text>
            <View>
              <Text style={styles.metaInfo}>
                Printed: {dayjs().format("MMM DD, YYYY")}
              </Text>
              <Text style={styles.metaInfo}>
                Range:{" "}
                {startDate ? dayjs(startDate).format("MMM DD, YYYY") : "?"} -{" "}
                {endDate ? dayjs(endDate).format("MMM DD, YYYY") : "?"}
              </Text>
            </View>
          </View>
          <Text style={{ marginTop: 20, textAlign: "center", color: "#666" }}>
            No data found for this date range.
          </Text>
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      {pages.map((pageContent, index) => (
        <Page key={index} size="A4" orientation="landscape" style={styles.page}>
          <View style={styles.headerContainer} fixed>
            <Text style={styles.reportTitle}>Job Status Report</Text>
            <Text style={styles.periodText}>
              {getReportingPeriod(startDate, endDate)}
            </Text>
            <View>
              <Text style={styles.metaInfo}>
                Printed: {dayjs().format("MMM DD, YYYY")}
              </Text>
              <Text
                style={styles.metaInfo}
                render={({ pageNumber, totalPages }) =>
                  `Page ${pageNumber} of ${totalPages}`
                }
              />
              <Text style={styles.metaInfo}>
                Range:{" "}
                {startDate ? dayjs(startDate).format("MMM DD, YYYY") : "?"} -{" "}
                {endDate ? dayjs(endDate).format("MMM DD, YYYY") : "?"}
              </Text>
            </View>
          </View>

          <View>{pageContent}</View>

          <Text
            style={styles.footer}
            fixed
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </Page>
      ))}
    </Document>
  );
};
