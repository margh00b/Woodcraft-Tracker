import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import dayjs from "dayjs";
import { ShippedNotInvoicedItem } from "@/hooks/useShippedNotInvoiced";
import { colors } from "@/theme";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 10,
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: colors.gray.title,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.violet.primary,
  },
  meta: {
    fontSize: 8,
    textAlign: "right",
    color: colors.gray.title,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.gray.title,
    backgroundColor: colors.gray.background,
    paddingVertical: 5,
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.gray.border,
    paddingVertical: 5,
    alignItems: "center",
  },
  colJob: {
    width: "15%",
    fontWeight: "bold",
    color: colors.gray.title,
  },
  colDate: {
    width: "15%",
    color: colors.gray.title,
  },
  colClient: {
    width: "30%",
    color: colors.gray.title,
  },
  colAddress: {
    width: "40%",
    color: colors.gray.title,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 8,
    color: colors.gray.title,
  },
});

export const ShippedNotInvoicedPdf = ({
  data,
  startDate,
  endDate,
}: {
  data: ShippedNotInvoicedItem[];
  startDate?: Date | null;
  endDate?: Date | null;
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Shipped Not Invoiced</Text>
        <View>
          <Text style={styles.meta}>
            Generated: {dayjs().format("DD-MMM-YY HH:mm")}
          </Text>
          <Text style={styles.meta}>
            Range: {startDate ? dayjs(startDate).format("DD-MMM") : "?"} -{" "}
            {endDate ? dayjs(endDate).format("DD-MMM") : "?"}
          </Text>
          <Text style={styles.meta}>Count: {data?.length || 0}</Text>
        </View>
      </View>

      <View style={styles.tableHeader}>
        <Text style={styles.colJob}>Job #</Text>
        <Text style={styles.colDate}>Ship Date</Text>
        <Text style={styles.colClient}>Client</Text>
        <Text style={styles.colAddress}>Shipping Address</Text>
      </View>

      {data.map((item) => (
        <View key={item.id} style={styles.row}>
          <Text style={styles.colJob}>{item.job_number || ""}</Text>
          <Text style={styles.colDate}>
            {item.ship_date ? dayjs(item.ship_date).format("MMM D, YYYY") : "-"}
          </Text>
          <Text style={styles.colClient}>
            {item.shipping_client_name || "Unknown"}
          </Text>
          <Text style={styles.colAddress}>
            {item.shipping_address || "Pick Up / No Address"}
          </Text>
        </View>
      ))}

      <Text
        style={styles.footer}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
        fixed
      />
    </Page>
  </Document>
);
