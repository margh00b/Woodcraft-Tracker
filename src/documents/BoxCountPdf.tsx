import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import dayjs from "dayjs";
import { ShippingReportJob } from "./ShippingReportPdf";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.4,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
    borderBottomWidth: 2,
    borderBottomColor: "#4A00E0",
    paddingBottom: 10,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4A00E0",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  reportSubtitle: {
    fontSize: 10,
    color: "#555",
    marginTop: 4,
  },
  metaInfo: {
    fontSize: 9,
    textAlign: "right",
    color: "#555",
  },

  table: {
    width: "100%",
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f3f5",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  totalRow: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    borderTopWidth: 1,
    borderTopColor: "#000",
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginTop: 2,
  },

  colMonth: { width: "20%", textAlign: "left" },
  colJobs: { width: "15%", textAlign: "center" },
  colPending: { width: "20%", textAlign: "center" },
  colShipped: { width: "20%", textAlign: "center" },
  colAvg: { width: "25%", textAlign: "right" },

  headerText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#333",
    textTransform: "uppercase",
  },
  rowText: {
    fontSize: 10,
    color: "#000",
  },
  boldText: {
    fontWeight: "bold",
  },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 8,
    color: "#999",
  },
});

export const BoxCountReportPdf = ({
  data,
  startDate,
  endDate,
}: {
  data: ShippingReportJob[];
  startDate: Date | null;
  endDate: Date | null;
}) => {
  const groupedData = data.reduce(
    (acc, job) => {
      const shipDate = job.production_schedule.ship_schedule;
      const monthKey = shipDate
        ? dayjs(shipDate).format("YYYY-MM")
        : "Unscheduled";

      if (!acc[monthKey]) {
        acc[monthKey] = {
          jobsCount: 0,
          pendingBoxes: 0,
          shippedBoxes: 0,
          monthLabel: shipDate
            ? dayjs(shipDate).format("MMMM YYYY")
            : "Unscheduled",
        };
      }

      const boxes = parseInt(job.sales_orders?.cabinet?.box || "0", 10);
      const safeBoxes = isNaN(boxes) ? 0 : boxes;

      acc[monthKey].jobsCount += 1;

      if (job.installation?.has_shipped) {
        acc[monthKey].shippedBoxes += safeBoxes;
      } else {
        acc[monthKey].pendingBoxes += safeBoxes;
      }

      return acc;
    },
    {} as Record<
      string,
      {
        jobsCount: number;
        pendingBoxes: number;
        shippedBoxes: number;
        monthLabel: string;
      }
    >,
  );

  const sortedKeys = Object.keys(groupedData).sort((a, b) => {
    if (a === "Unscheduled") return 1;
    if (b === "Unscheduled") return -1;
    return a.localeCompare(b);
  });

  const grandTotal = Object.values(groupedData).reduce(
    (acc, curr) => ({
      jobs: acc.jobs + curr.jobsCount,
      pending: acc.pending + curr.pendingBoxes,
      shipped: acc.shipped + curr.shippedBoxes,
    }),
    { jobs: 0, pending: 0, shipped: 0 },
  );

  const totalBoxes = grandTotal.pending + grandTotal.shipped;
  const grandAvg =
    grandTotal.jobs > 0 ? (totalBoxes / grandTotal.jobs).toFixed(0) : "0.0";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.reportTitle}>Monthly Box Volume</Text>
            <Text style={styles.reportSubtitle}>
              Period: {startDate ? dayjs(startDate).format("MMM D, YYYY") : "?"}{" "}
              — {endDate ? dayjs(endDate).format("MMM D, YYYY") : "?"}
            </Text>
          </View>
          <View>
            <Text style={styles.metaInfo}>
              Generated: {dayjs().format("MMM D, HH:mm")}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colMonth]}>Month</Text>
            <Text style={[styles.headerText, styles.colJobs]}>Total Jobs</Text>
            <Text style={[styles.headerText, styles.colPending]}>
              Pending Boxes
            </Text>
            <Text style={[styles.headerText, styles.colShipped]}>
              Shipped Boxes
            </Text>
            <Text style={[styles.headerText, styles.colAvg]}>
              Avg Box/Order
            </Text>
          </View>

          {sortedKeys.map((key) => {
            const row = groupedData[key];
            const totalRowBoxes = row.pendingBoxes + row.shippedBoxes;
            const avg =
              row.jobsCount > 0
                ? (totalRowBoxes / row.jobsCount).toFixed(0)
                : "0";

            return (
              <View style={styles.tableRow} key={key}>
                <Text
                  style={[styles.rowText, styles.colMonth, styles.boldText]}
                >
                  {row.monthLabel}
                </Text>
                <Text style={[styles.rowText, styles.colJobs]}>
                  {row.jobsCount}
                </Text>
                <Text style={[styles.rowText, styles.colPending]}>
                  {row.pendingBoxes}
                </Text>
                <Text style={[styles.rowText, styles.colShipped]}>
                  {row.shippedBoxes}
                </Text>
                <Text style={[styles.rowText, styles.colAvg]}>{avg}</Text>
              </View>
            );
          })}

          <View style={styles.totalRow}>
            <Text style={[styles.rowText, styles.colMonth, styles.boldText]}>
              GRAND TOTAL
            </Text>
            <Text style={[styles.rowText, styles.colJobs, styles.boldText]}>
              {grandTotal.jobs}
            </Text>
            <Text style={[styles.rowText, styles.colPending, styles.boldText]}>
              {grandTotal.pending}
            </Text>
            <Text style={[styles.rowText, styles.colShipped, styles.boldText]}>
              {grandTotal.shipped}
            </Text>
            <Text style={[styles.rowText, styles.colAvg, styles.boldText]}>
              {grandAvg}
            </Text>
          </View>
        </View>

        <Text
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
          fixed
          style={styles.footer}
        />
      </Page>
    </Document>
  );
};
