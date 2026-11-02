import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import dayjs from "dayjs";
import { AccountingJobItem } from "@/hooks/useAccountingJobReport";
import { colors } from "@/theme";

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: "Helvetica",
    fontSize: 9,
  },
  header: {
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: colors.gray.title,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: { fontSize: 16, fontWeight: "bold", color: colors.violet.primary },
  meta: { fontSize: 8, textAlign: "right", color: colors.gray.title },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.gray.title,
    backgroundColor: colors.gray.background,
    paddingVertical: 6,
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.gray.border,
    paddingVertical: 7,
    alignItems: "center",
  },
  colJob: { width: "8%", paddingLeft: 2, fontWeight: "bold", color: colors.gray.title },
  colClient: { width: "18%", color: colors.gray.title },
  colAddress: { width: "28%", color: colors.gray.title, paddingRight: 6 },
  colShipDate: { width: "12%", color: colors.gray.title, textAlign: "center" },
  colPrice: { width: "17%", color: colors.gray.title, textAlign: "right", paddingRight: 4, fontWeight: "bold" },
  colPercent: { width: "17%", textAlign: "center", fontWeight: "bold", color: colors.blue.primary },
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

const formatPrice = (price: number | null) =>
  price == null
    ? "—"
    : price.toLocaleString("en-CA", {
        style: "currency",
        currency: "CAD",
      });

export const AccountingJobReportPdf = ({ data }: { data: AccountingJobItem[] }) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Accounting Job Report</Text>
          <Text>All active jobs currently not shipped</Text>
        </View>
        <View>
          <Text style={styles.meta}>
            Generated: {dayjs().format("DD-MMM-YY HH:mm")}
          </Text>
          <Text style={styles.meta}>Jobs: {data?.length || 0}</Text>
        </View>
      </View>

      <View style={styles.tableHeader}>
        <Text style={styles.colJob}>Job #</Text>
        <Text style={styles.colClient}>Client</Text>
        <Text style={styles.colAddress}>Shipping Address</Text>
        <Text style={styles.colShipDate}>Ship Date</Text>
        <Text style={styles.colPrice}>Price</Text>
        <Text style={styles.colPercent}>% Done</Text>
      </View>

      {data.map((item) => (
        <View key={item.id} style={styles.row} wrap={false}>
          <Text style={styles.colJob}>{item.job_number}</Text>
          <Text style={styles.colClient}>{item.shipping_client_name}</Text>
          <Text style={styles.colAddress}>{item.shipping_address || "—"}</Text>
          <Text style={styles.colShipDate}>
            {item.ship_schedule
              ? dayjs(item.ship_schedule).format("DD-MMM-YY")
              : "TBD"}
          </Text>
          <Text style={styles.colPrice}>{formatPrice(item.price)}</Text>
          <Text style={styles.colPercent}>{item.completion_percentage}%</Text>
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
