import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import dayjs from "dayjs";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.5,
    flexDirection: "column",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 10,
  },
  reportTitle: { fontSize: 18, fontWeight: "bold", textTransform: "uppercase" },
  metaInfo: { fontSize: 10, textAlign: "right" },

  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
    backgroundColor: "#f0f0f0",
    padding: 3,
  },

  row: {
    flexDirection: "row",
    marginBottom: 5,
  },
  label: {
    width: "25%",
    fontWeight: "bold",
    color: "#444",
  },
  value: {
    width: "75%",
  },

  notesContainer: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    padding: 10,
    minHeight: 100,
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

interface SingleSiteVisitPdfProps {
  data: any;
}

export const SingleSiteVisitPdf = ({ data }: SingleSiteVisitPdfProps) => {
  if (!data)
    return (
      <Document>
        <Page size="A4">
          <Text>No Data</Text>
        </Page>
      </Document>
    );

  const address = [
    data.jobs?.sales_orders?.shipping_street,
    data.jobs?.sales_orders?.shipping_city,
    data.jobs?.sales_orders?.shipping_province,
    data.jobs?.sales_orders?.shipping_zip,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.reportTitle}>Site Visit Record</Text>
            <Text style={{ fontSize: 11, fontWeight: "bold", marginTop: 5 }}>
              Job #{data.jobs?.job_number || "—"}
            </Text>
          </View>
          <View>
            <Text style={styles.metaInfo}>
              Printed: {dayjs().format("MMM D, YYYY")}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client & Site Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Client Name:</Text>
            <Text style={styles.value}>
              {data.jobs?.sales_orders?.shipping_client_name || "—"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Site Address:</Text>
            <Text style={styles.value}>{address || "—"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visit Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Date of Visit:</Text>
            <Text style={styles.value}>
              {data.visit_date
                ? dayjs(data.visit_date).format("MMMM D, YYYY")
                : "—"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Visited By:</Text>
            <Text style={styles.value}>{data.created_by || "—"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.notesContainer}>
            <Text>{data.notes || "No notes recorded."}</Text>
          </View>
        </View>

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
};
