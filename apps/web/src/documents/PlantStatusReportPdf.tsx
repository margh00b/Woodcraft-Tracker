import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import dayjs from "dayjs";
import { PlantStatusItem } from "@/hooks/usePlantStatusReport";
import { colors } from "@/theme";

const styles = StyleSheet.create({
  page: {
    padding: 20,
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
  },
  title: { fontSize: 16, fontWeight: "bold", color: colors.violet.primary },
  meta: { fontSize: 8, textAlign: "right", color: colors.gray.title },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.gray.title,
    backgroundColor: colors.gray.background,
    paddingVertical: 4,
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.gray.border,
    paddingVertical: 6,
    alignItems: "center",
  },
  colJob: {
    width: "9%",
    paddingLeft: 2,
    fontWeight: "bold",
    color: colors.gray.title,
  },
  colClient: { width: "20%", color: colors.gray.title },
  colAddress: { width: "23%", color: colors.gray.title },

  colStatusGroup: {
    width: "40%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  colStatusItem: { width: "12.5%", alignItems: "center" },

  colPercent: {
    width: "9%",
    textAlign: "center",
    fontWeight: "bold",
    color: colors.blue.primary,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#eee",
  },
  statusDotActive: { backgroundColor: colors.green.primary },

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

const StatusCell = ({ isActive }: { isActive: boolean }) => (
  <View style={styles.colStatusItem}>
    <View style={[styles.statusDot, isActive ? styles.statusDotActive : {}]} />
  </View>
);

export const PlantStatusPdf = ({ data }: { data: PlantStatusItem[] }) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Plant Status Report</Text>
        <Text>(Job's In Plant)</Text>
        <View>
          <Text style={styles.meta}>
            Generated: {dayjs().format("DD-MMM-YY HH:mm")}
          </Text>
          <Text style={styles.meta}>
            Jobs (In Progress): {data?.length || 0}
          </Text>
        </View>
      </View>

      <View style={styles.tableHeader}>
        <Text style={styles.colJob}>Job #</Text>
        <Text style={styles.colClient}>Client</Text>
        <Text style={styles.colAddress}>Shipping Address</Text>
        <View style={styles.colStatusGroup}>
          <Text
            style={[styles.colStatusItem, { fontSize: 8, textAlign: "center" }]}
          >
            Cut Mel
          </Text>
          <Text
            style={[styles.colStatusItem, { fontSize: 8, textAlign: "center" }]}
          >
            Cut Fin
          </Text>
          <Text
            style={[styles.colStatusItem, { fontSize: 8, textAlign: "center" }]}
          >
            Cust Fin
          </Text>
          <Text
            style={[styles.colStatusItem, { fontSize: 8, textAlign: "center" }]}
          >
            Doors
          </Text>
          <Text
            style={[styles.colStatusItem, { fontSize: 8, textAlign: "center" }]}
          >
            Drawers
          </Text>
          <Text
            style={[styles.colStatusItem, { fontSize: 8, textAlign: "center" }]}
          >
            Paint
          </Text>
          <Text
            style={[styles.colStatusItem, { fontSize: 8, textAlign: "center" }]}
          >
            Assembly
          </Text>
          <Text
            style={[styles.colStatusItem, { fontSize: 8, textAlign: "center" }]}
          >
            Wrap
          </Text>
        </View>
        <Text style={styles.colPercent}>% Done</Text>
      </View>

      {data.map((item) => (
        <View key={item.id} style={styles.row} wrap={false}>
          <Text style={styles.colJob}>{item.job_number}</Text>
          <Text style={styles.colClient}>{item.shipping_client_name}</Text>
          <Text style={styles.colAddress}>{item.shipping_address}</Text>

          <View style={styles.colStatusGroup}>
            <StatusCell isActive={!!item.cut_melamine} />
            <StatusCell isActive={!!item.cut_finish} />
            <StatusCell isActive={!!item.custom_finish} />
            <StatusCell isActive={!!item.doors} />
            <StatusCell isActive={!!item.drawers} />
            <StatusCell isActive={!!item.paint} />
            <StatusCell isActive={!!item.assembly} />
            <StatusCell isActive={!!item.wrap} />
          </View>

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
