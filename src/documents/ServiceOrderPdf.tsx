import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import Html from "react-pdf-html";
import dayjs from "dayjs";

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 30,
    paddingLeft: 40,
    paddingRight: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.3,
  },

  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  dateContainer: {
    alignItems: "flex-end",
  },
  dateRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  dateLabel: {
    fontWeight: "bold",
    marginRight: 5,
    fontSize: 9,
  },
  dateValue: {
    fontSize: 9,
  },

  infoContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },
  leftCol: {
    width: "70%",
  },
  rightCol: {
    width: "30%",
    paddingLeft: 10,
  },

  row: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "flex-start",
  },
  label: {
    width: 100,
    fontSize: 10,
    fontWeight: "bold",
  },
  value: {
    flex: 1,
    fontSize: 10,
    fontWeight: "normal",
  },

  commentsSection: {
    marginTop: 10,
    borderBottomWidth: 4,
    borderBottomColor: "#000",
    paddingBottom: 5,
    marginBottom: 5,
  },
  commentsHeader: {
    fontSize: 12,
    textDecoration: "underline",
    fontWeight: "bold",
    marginBottom: 5,
  },

  table: {
    marginTop: 5,
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000",
    paddingVertical: 2,
    marginBottom: 5,
  },
  tableHeaderLabel: {
    fontSize: 9,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  colQty: { width: "10%" },
  colPart: { width: "30%" },
  colDescription: { width: "60%" },
});

const htmlStyles = {
  body: {
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.4,
  },
  p: { fontSize: 10 },
  ul: { fontSize: 10 },
  li: { fontSize: 10 },
  strong: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold" as const,
  },
  b: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold" as const,
  },
  em: {
    fontSize: 10,
    fontFamily: "Helvetica-Oblique",
    fontStyle: "normal" as const,
  },
  i: {
    fontSize: 10,
    fontFamily: "Helvetica-Oblique",
    fontStyle: "normal" as const,
  },
};
interface PdfProps {
  data: any;
}

export const ServiceOrderPdf = ({ data }: PdfProps) => {
  const job = data.jobs || {};
  const so = job.sales_orders || {};
  const cab = so.cabinet || {};
  const installer = data.installers || {};
  const homeowner = job.homeowners_info || {};

  const address = [so.shipping_street, so.shipping_city]
    .filter(Boolean)
    .join(", ");

  const processContent = (content: string | null) => {
    if (!content) return "<p>No comments provided.</p>";

    const isHtml = /<[a-z][\s\S]*>/i.test(content);

    if (isHtml) {
      return content;
    }

    return content.replace(/\n/g, "<br />");
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>
            Service Order: {data.service_order_number}
          </Text>
          <View style={styles.dateContainer}>
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>Date Entered</Text>
              <Text style={styles.dateValue}>
                {dayjs(data.date_entered).format("DD-MMM-YY")}
              </Text>
            </View>
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>Date due</Text>
              <Text style={styles.dateValue}>
                {data.due_date ? dayjs(data.due_date).format("DD-MMM-YY") : "—"}
              </Text>
            </View>
          </View>
        </View>

        {}
        <View style={styles.infoContainer}>
          {}
          <View style={styles.leftCol}>
            <View style={styles.row}>
              <Text style={styles.label}>Job Number:</Text>
              <Text style={styles.value}>{job.job_number || "—"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Customer:</Text>
              <Text style={styles.value}>{so.shipping_client_name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{address || "—"}</Text>
            </View>

            <View style={{ height: 10 }} />

            <View style={styles.row}>
              <Text style={styles.label}>Species:</Text>
              <Text style={styles.value}>{cab.species?.Species || "—"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Color:</Text>
              <Text style={{ ...styles.value, textTransform: "uppercase" }}>
                {cab.colors?.Name || "—"}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Door Style:</Text>
              <Text style={{ ...styles.value, textTransform: "uppercase" }}>
                {cab.door_styles?.name || "—"}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Top Drawer Front:</Text>
              <Text style={{ ...styles.value, textTransform: "uppercase" }}>
                {cab.top_drawer_front || "—"}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Interior:</Text>
              <Text style={{ ...styles.value, textTransform: "uppercase" }}>
                {cab.interior || "—"}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Soft Close Hinge:</Text>
              <Text style={{ ...styles.value }}>
                {cab.hinge_soft_close ? "Yes" : "No"}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Drawer Box:</Text>
              <Text style={{ ...styles.value, textTransform: "uppercase" }}>
                {cab.drawer_box || "—"}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Drawer Hardware:</Text>
              <Text style={{ ...styles.value, textTransform: "uppercase" }}>
                {cab.drawer_hardware || "—"}
              </Text>
            </View>
          </View>

          {}
          <View style={styles.rightCol}>
            <View style={{ marginBottom: 15 }}>
              <Text
                style={{ fontSize: 10, fontWeight: "bold", marginBottom: 2 }}
              >
                Installer
              </Text>
              <Text style={{ fontSize: 10 }}>
                {installer.first_name
                  ? `${installer.first_name} ${installer.last_name}`
                  : ""}
              </Text>
              <Text style={{ fontSize: 10 }}>
                {installer.company_name || "—"}
              </Text>
            </View>

            <View style={{ marginBottom: 15, flexDirection: "row" }}>
              <Text
                style={{ fontSize: 10, fontWeight: "bold", marginRight: 5 }}
              >
                Designer
              </Text>
              <Text style={{ fontSize: 10 }}>{so.designer || "—"}</Text>
            </View>
            {(homeowner?.homeowner_name ||
              homeowner?.homeowner_phone ||
              homeowner?.homeowner_email) && (
              <View style={{ marginBottom: 15, flexDirection: "column" }}>
                <Text
                  style={{ fontSize: 10, fontWeight: "bold", marginRight: 5 }}
                >
                  Homeowner Info
                </Text>

                <Text style={{ fontSize: 10 }}>
                  {homeowner.homeowner_name || "—"}
                </Text>

                <Text style={{ fontSize: 10 }}>
                  {homeowner.homeowner_phone || "—"}
                </Text>

                <Text style={{ fontSize: 10 }}>
                  {homeowner.homeowner_email || "—"}
                </Text>
              </View>
            )}
          </View>
        </View>

        {}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsHeader}>Comments</Text>
          {}
          <Html stylesheet={htmlStyles} style={{ fontSize: 10 }}>
            {processContent(data.comments)}
          </Html>
        </View>

        {}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colQty}>
              <Text style={styles.tableHeaderLabel}>Qty</Text>
            </View>
            <View style={styles.colPart}>
              <Text style={styles.tableHeaderLabel}>Part</Text>
            </View>
            <View style={styles.colPart}>
              <Text style={styles.tableHeaderLabel}>Description</Text>
            </View>
          </View>

          {data.service_order_parts && data.service_order_parts.length > 0 ? (
            data.service_order_parts.map((part: any, i: number) => (
              <View style={styles.tableRow} key={i}>
                <View style={styles.colQty}>
                  <Text style={{ fontSize: 10 }}>{part.qty}</Text>
                </View>
                <View style={styles.colPart}>
                  <Text style={{ fontSize: 10, textTransform: "uppercase" }}>
                    {part.part}
                  </Text>
                </View>
                <View style={styles.colDescription}>
                  <Text style={{ fontSize: 10, textTransform: "uppercase" }}>
                    {part.description}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={{ fontSize: 10, fontStyle: "italic", marginTop: 5 }}>
              No parts listed
            </Text>
          )}
        </View>

        {}
        <Text
          style={{
            position: "absolute",
            bottom: 30,
            left: 30,
            fontSize: 8,
            color: "#aaa",
          }}
        >
          Generated on {dayjs().format("YYYY-MM-DD HH:mm")}
        </Text>
      </Page>
    </Document>
  );
};
