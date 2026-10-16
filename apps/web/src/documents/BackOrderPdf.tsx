import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import dayjs from "dayjs";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 15,
  },
  meta: {
    fontSize: 9,
    textAlign: "right",
    justifyContent: "flex-end",
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
    backgroundColor: "#f0f0f0",
    padding: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 100,
    fontWeight: "bold",
    fontSize: 9,
    color: "#555",
  },
  value: {
    flex: 1,
    fontSize: 10,
  },
  commentsBox: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    minHeight: 100,
    marginTop: 5,
  },
});

interface BackorderPdfProps {
  data: any;
}

export const BackorderPdf = ({ data }: BackorderPdfProps) => {
  const job = data.jobs || {};
  const so = job.sales_orders || {};
  const cab = so.cabinet || {};

  const address = [
    so.shipping_street,
    so.shipping_city,
    so.shipping_province,
    so.shipping_zip,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Backorder</Text>
            <Text style={{ fontSize: 14, fontWeight: "bold", marginTop: 5 }}>
              ID: BO-{data.id}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: "bold", marginTop: 2 }}>
              Job #: {job.job_number}
            </Text>
          </View>

          <View style={styles.meta}>
            <Text>
              Date Entered: {dayjs(data.date_entered).format("MMM D, YYYY")}
            </Text>
            <Text>
              Due Date:{" "}
              {data.due_date
                ? dayjs(data.due_date).format("MMM D, YYYY")
                : "TBD"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client & Shipping</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Client Name:</Text>
            <Text style={styles.value}>{so.shipping_client_name || "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{address || "—"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cabinet Specifications</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Species:</Text>
            <Text style={styles.value}>{cab.species?.Species || "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Color:</Text>
            <Text style={styles.value}>{cab.colors?.Name || "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Door Style:</Text>
            <Text style={styles.value}>{cab.door_styles?.name || "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Box:</Text>
            <Text style={styles.value}>{cab.box || "—"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backorder Details</Text>
          <View style={styles.commentsBox}>
            <Text>{data.comments || "No details provided."}</Text>
          </View>
        </View>

        <Text
          style={{
            position: "absolute",
            bottom: 30,
            left: 30,
            fontSize: 8,
            color: "#999",
          }}
        >
          Generated on {dayjs().format("YYYY-MM-DD HH:mm")}
        </Text>
      </Page>
    </Document>
  );
};
