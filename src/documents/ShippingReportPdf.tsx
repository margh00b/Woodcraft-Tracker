import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import dayjs from "dayjs";
import { Tables } from "@/types/db";

// Define specific types for the joined data
export type ShippingReportJob = Tables<"jobs"> & {
  sales_orders: Tables<"sales_orders"> & {
    cabinet: Tables<"cabinets"> | null;
  };
  production_schedule: Tables<"production_schedule">;
};

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 9,
    lineHeight: 1.3,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    paddingBottom: 5,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  metaInfo: {
    fontSize: 8,
    textAlign: "right",
  },
  // Date Group Header
  dateGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 2,
    borderTopColor: "#000",
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    backgroundColor: "#dfdfdf",
    paddingVertical: 4,
    paddingHorizontal: 5,
    marginTop: 10,
    marginBottom: 5,
  },
  dateGroupText: {
    fontSize: 11,
    fontWeight: "bold",
    paddingHorizontal: 5,
  },
  // Table Styles
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
    alignItems: "center",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingVertical: 3,
    marginBottom: 2,
  },
  headerText: {
    fontSize: 8,
    fontWeight: "bold",
  },

  // --- ADJUSTED COLUMNS (TOTAL = 100%) ---
  colJob: { width: "10%" },
  colCust: { width: "15%" },
  colAddr: { width: "20%" },
  colBox: { width: "5%", textAlign: "center" },
  colDoor: { width: "15%" }, // New style for Door Style column
  colSpec: { width: "10%" },
  colColor: { width: "10%" },

  // Updated colCheck to handle both Text (header) and View (row) alignment
  colCheck: {
    width: "3%",
    alignItems: "center",
    textAlign: "center",
  },

  // Checkbox
  checkbox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
    marginRight: "auto",
  },
  checkMark: {
    fontSize: 7,
    lineHeight: 1,
    fontWeight: "bold",
    paddingBottom: 1,
  },

  // Total Row
  totalRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 2,
    marginBottom: 10,
  },
  totalText: {
    fontSize: 9,
    fontWeight: "bold",
  },
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

const Checkbox = ({ checked }: { checked: boolean }) => (
  <View style={styles.checkbox}>
    {checked ? <Text style={styles.checkMark}>X</Text> : null}
  </View>
);

export const ShippingReportPdf = ({
  data,
  startDate,
  endDate,
}: {
  data: ShippingReportJob[];
  startDate: Date | null;
  endDate: Date | null;
}) => {
  // Group data by ship date
  const grouped = data.reduce((acc, job) => {
    const dateKey = job.production_schedule.ship_schedule || "No Date";
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(job);
    return acc;
  }, {} as Record<string, ShippingReportJob[]>);

  // Sort dates
  const sortedDates = Object.keys(grouped).sort((a, b) => {
    if (a === "No Date") return 1;
    if (b === "No Date") return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.reportTitle}>Orders Shipping by Date</Text>
          <View>
            <Text style={styles.metaInfo}>
              Printed: {dayjs().format("DD-MMM-YY")}
            </Text>
            <Text style={styles.metaInfo}>
              Report Range:{" "}
              {startDate ? dayjs(startDate).format("DD-MMM-YY") : "?"} -{" "}
              {endDate ? dayjs(endDate).format("DD-MMM-YY") : "?"}
            </Text>
          </View>
        </View>

        {sortedDates.map((dateKey) => {
          const jobs = grouped[dateKey];
          const dateObj = dayjs(dateKey);
          const formattedDate =
            dateKey === "No Date" ? "Unscheduled" : dateObj.format("DD-MMM-YY");
          const dayName = dateKey === "No Date" ? "" : dateObj.format("dddd");

          // Calculate Box Total
          const boxTotal = jobs.reduce((sum, job) => {
            const box = parseInt(job.sales_orders?.cabinet?.box || "0", 10);
            return isNaN(box) ? sum : sum + box;
          }, 0);

          return (
            <View key={dateKey} wrap={false}>
              {/* Date Divider */}
              <View style={styles.dateGroupHeader}>
                <Text style={styles.dateGroupText}>Ship Date:</Text>
                <Text style={styles.dateGroupText}>{formattedDate}</Text>
                <Text style={styles.dateGroupText}>{dayName}</Text>
              </View>

              {/* Column Headers */}
              <View style={styles.tableHeader}>
                <Text style={[styles.headerText, styles.colJob]}>
                  Job Number
                </Text>
                <Text style={[styles.headerText, styles.colCust]}>
                  Customer
                </Text>
                <Text style={[styles.headerText, styles.colAddr]}>Address</Text>
                <Text style={[styles.headerText, styles.colBox]}>Box</Text>
                {/* Using new colDoor style for proper width */}
                <Text style={[styles.headerText, styles.colDoor]}>
                  Door Style
                </Text>
                <Text style={[styles.headerText, styles.colSpec]}>Species</Text>
                <Text style={[styles.headerText, styles.colColor]}>Color</Text>
                <Text style={[styles.headerText, styles.colCheck]}>D</Text>
                <Text style={[styles.headerText, styles.colCheck]}>P</Text>
                <Text style={[styles.headerText, styles.colCheck]}>F/C</Text>
                <Text style={[styles.headerText, styles.colCheck]}>P/S</Text>
                <Text style={[styles.headerText, styles.colCheck]}>A</Text>
              </View>

              {/* Job Rows */}
              {jobs.map((job) => {
                const so = job.sales_orders;
                const cab = so?.cabinet;
                const ps = job.production_schedule;

                return (
                  <View style={styles.tableRow} key={job.id}>
                    <Text style={[styles.colJob, { fontSize: 8 }]}>
                      {job.job_number}
                    </Text>
                    <Text style={[styles.colCust, { fontSize: 8 }]}>
                      {so.shipping_client_name || "Unknown"}
                    </Text>
                    <Text style={[styles.colAddr, { fontSize: 8 }]}>
                      {[so.shipping_street, so.shipping_zip, so.shipping_city]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </Text>

                    <View style={styles.colBox}>
                      <Text style={{ fontWeight: "bold" }}>
                        {cab?.box || "0"}
                      </Text>
                    </View>
                    {/* Using new colDoor style */}
                    <View style={styles.colDoor}>
                      <Text>{cab?.door_style || ""}</Text>
                    </View>

                    <Text style={[styles.colSpec, { fontSize: 8 }]}>
                      {cab?.species || "—"}
                    </Text>
                    <Text style={[styles.colColor, { fontSize: 8 }]}>
                      {cab?.color || "—"}
                    </Text>

                    {/* Checkboxes */}
                    <View style={styles.colCheck}>
                      <Checkbox checked={!!ps.doors_completed_actual} />
                    </View>
                    <View style={styles.colCheck}>
                      <Checkbox checked={!!ps.cut_finish_completed_actual} />
                    </View>
                    <View style={styles.colCheck}>
                      <Checkbox checked={!!ps.custom_finish_completed_actual} />
                    </View>
                    <View style={styles.colCheck}>
                      <Checkbox checked={!!ps.paint_completed_actual} />
                    </View>
                    <View style={styles.colCheck}>
                      <Checkbox checked={!!ps.assembly_completed_actual} />
                    </View>
                  </View>
                );
              })}

              {/* Totals */}
              <View style={styles.totalRow}>
                <Text style={styles.totalText}>Total Boxes: {boxTotal}</Text>
              </View>
            </View>
          );
        })}

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
