import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import Html from "react-pdf-html";
import dayjs from "dayjs";

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 70,
    paddingLeft: 40,
    paddingRight: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
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
    paddingBottom: 10,
    borderBottomWidth: 4,
    borderBottomColor: "#000",
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
  colQty: { width: "8%" },
  colPart: { width: "20%" },
  colDescription: { width: "40%" },
  colLocation: { width: "11%" },
  colDueDate: { width: "10%" },
  colStatus: { width: "11%" },

  // Updated Signature Styles
  signatureContainer: {
    position: "absolute",
    bottom: 45,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBoxLeft: {
    width: "45%",
  },
  signatureBoxRight: {
    width: "45%",
    marginLeft: 15, // Pushes the client signature a bit further to the right
  },
  signatureLine: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 15,
  },
  dateLine: {
    fontSize: 9,
    fontWeight: "bold",
  },
});

const htmlStyles = {
  body: {
    fontFamily: "Helvetica",
    fontSize: 10,
  },
  p: {
    fontSize: 10,
    marginTop: 0,
    marginBottom: 0,
  },
  ul: {
    fontSize: 10,
    marginBottom: 4,
    marginTop: 4,
    paddingLeft: 0,
  },
  li: {
    fontSize: 10,
    marginBottom: 0,
    marginLeft: 0,
    paddingLeft: 0,
  },
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
      return content
        .replace(/<li>\s*<p[^>]*>/g, "<li>")
        .replace(/<\/p>\s*<\/li>/g, "</li>")
        .replace(/<p><\/p>/g, "<br />")
        .replace(/ï¿½/g, "...");
    }

    return content.replace(/\n/g, "<br />");
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
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

        <View style={styles.row}>
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>
            {data.completed_at ? "Completed" : "Pending"}
          </Text>
        </View>

        <View style={styles.infoContainer}>
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
              homeowner?.homeowner_email ||
              homeowner?.homeowner_details) && (
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
                <Text style={{ fontSize: 10, marginBottom: 10 }}>
                  {homeowner.homeowner_details || "—"}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.commentsSection}>
          <Text style={styles.commentsHeader}>Comments</Text>
          <Html stylesheet={htmlStyles} style={{ fontSize: 10 }}>
            {processContent(data.comments)}
          </Html>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colQty}>
              <Text style={styles.tableHeaderLabel}>Qty</Text>
            </View>
            <View style={styles.colPart}>
              <Text style={styles.tableHeaderLabel}>Part</Text>
            </View>
            <View style={styles.colDescription}>
              <Text style={styles.tableHeaderLabel}>Description</Text>
            </View>
            <View style={styles.colLocation}>
              <Text style={styles.tableHeaderLabel}>Location</Text>
            </View>
            <View style={styles.colDueDate}>
              <Text style={styles.tableHeaderLabel}>Due Date</Text>
            </View>
            <View style={styles.colStatus}>
              <Text style={styles.tableHeaderLabel}>Status</Text>
            </View>
          </View>

          {data.service_order_parts && data.service_order_parts.length > 0 ? (
            data.service_order_parts.map((part: any, i: number) => (
              <View style={styles.tableRow} key={i}>
                <View style={styles.colQty}>
                  <Text style={{ fontSize: 8 }}>{part.qty}</Text>
                </View>
                <View style={styles.colPart}>
                  <Text style={{ fontSize: 8, textTransform: "uppercase" }}>
                    {part.part}
                  </Text>
                </View>
                <View style={styles.colDescription}>
                  <Text style={{ fontSize: 8, textTransform: "uppercase" }}>
                    {part.description}
                  </Text>
                </View>
                <View style={styles.colLocation}>
                  <Text style={{ fontSize: 8, textTransform: "uppercase" }}>
                    {part.location || "—"}
                  </Text>
                </View>
                <View style={styles.colDueDate}>
                  <Text style={{ fontSize: 8 }}>
                    {part.part_due_date
                      ? dayjs(part.part_due_date).format("MMM D, YYYY")
                      : "—"}
                  </Text>
                </View>
                <View style={styles.colStatus}>
                  <Text style={{ fontSize: 8, textTransform: "uppercase" }}>
                    {part.status || "—"}
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

        {/* Bottom Signatures Section */}
        <View style={styles.signatureContainer}>
          <View style={styles.signatureBoxLeft}>
            <Text style={styles.signatureLine}>
              Service Tech Signature: _____________________
            </Text>
            <Text style={styles.dateLine}>Date: _____________</Text>
          </View>
          <View style={styles.signatureBoxRight}>
            <Text style={styles.signatureLine}>
              Client Signature: _____________________
            </Text>
            <Text style={styles.dateLine}>Date: _____________</Text>
          </View>
        </View>

        <Text
          style={{
            position: "absolute",
            bottom: 20,
            left: 40,
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
