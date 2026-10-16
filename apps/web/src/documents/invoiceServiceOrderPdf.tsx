import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import dayjs from "dayjs";
import { ServiceOrderChargeableItem } from "@/hooks/useServiceOrdersChargeable";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 9,
    lineHeight: 1.5,
    color: "#333333",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#228be6", // Matching Mantine Blue brand tone
    paddingBottom: 12,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1c7ed6",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  reportSubtitle: {
    fontSize: 9,
    color: "#666666",
    marginTop: 3,
  },
  metaInfo: {
    fontSize: 8,
    textAlign: "right",
    color: "#868e96",
  },
  table: {
    width: "100%",
    marginTop: 5,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#dee2e6",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e9ecef",
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  headerText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#495057",
  },
  rowText: {
    fontSize: 9,
    color: "#212529",
  },
  boldText: {
    fontWeight: "bold",
  },
  // Column sizing ratios to keep text cleanly aligned without truncating
  colOrderNum: { width: "18%" },
  colJobNum: { width: "12%" },
  colClient: { width: "25%" },
  colAddress: { width: "25%" },
  colDate: { width: "12%" },
  colStatus: { width: "8%", textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 8,
    color: "#adb5bd",
  },
});

interface ServiceOrdersPdfProps {
  data: ServiceOrderChargeableItem[];
}

export const ServiceOrdersPdf = ({ data }: ServiceOrdersPdfProps) => {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Document Header Section */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.reportTitle}>Chargeable Service Orders</Text>
            <Text style={styles.reportSubtitle}>
              Service orders marked as chargeable but not yet invoiced.
            </Text>
          </View>
          <View>
            <Text style={styles.metaInfo}>
              Total Records: {data.length}
            </Text>
            <Text style={styles.metaInfo}>
              Generated: {dayjs().format("MMM D, YYYY · HH:mm")}
            </Text>
          </View>
        </View>

        {/* Data Matrix Grid Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colOrderNum]}>Service Order #</Text>
            <Text style={[styles.headerText, styles.colJobNum]}>Job #</Text>
            <Text style={[styles.headerText, styles.colClient]}>Client</Text>
            <Text style={[styles.headerText, styles.colAddress]}>Address</Text>
            <Text style={[styles.headerText, styles.colDate]}>Due Date</Text>
            <Text style={[styles.headerText, styles.colStatus]}>Status</Text>
          </View>

          {data.map((row, index) => {
            const completed = !!row.completed_at;
            return (
              <View style={styles.tableRow} key={row.service_order_id || index}>
                <Text style={[styles.rowText, styles.colOrderNum, styles.boldText]}>
                  {row.service_order_number || "—"}
                </Text>
                <Text style={[styles.rowText, styles.colJobNum]}>
                  {row.job_number || "—"}
                </Text>
                <Text style={[styles.rowText, styles.colClient]}>
                  {row.client_name || "—"}
                </Text>
                <Text style={[styles.rowText, styles.colAddress]}>
                  {row.shipping_address || "—"}
                </Text>
                <Text style={[styles.rowText, styles.colDate]}>
                  {row.due_date ? dayjs(row.due_date).format("MMM D, YYYY") : "—"}
                </Text>
                <Text style={[styles.rowText, styles.colStatus]}>
                  {completed ? "Completed" : "Open"}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Footer Page Numbers Pagination */}
        <Text
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          fixed
          style={styles.footer}
        />
      </Page>
    </Document>
  );
};