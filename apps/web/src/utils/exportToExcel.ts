import * as XLSX from "xlsx-js-style";
import dayjs from "dayjs";

export const exportToExcel = (
  data: any[],
  fileName: string,
  options?: {
    onSheetCreated?: (
      worksheet: any,
      range: any,
      utils: typeof XLSX.utils,
      firstDataRow: number,
    ) => void;
    customHeaders?: string[][];
    merges?: XLSX.Range[];
  },
) => {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  const headerOffset = options?.customHeaders
    ? options.customHeaders.length
    : 0;
  const origin = headerOffset > 0 ? `A${headerOffset + 1}` : "A1";

  const worksheet = XLSX.utils.json_to_sheet(data, { origin } as any);

  if (options?.customHeaders) {
    XLSX.utils.sheet_add_aoa(worksheet, options.customHeaders, {
      origin: "A1",
    });
  }

  if (options?.merges) {
    if (!worksheet["!merges"]) worksheet["!merges"] = [];
    worksheet["!merges"].push(...options.merges);
  }

  const headerColor = "4A00E0";
  const stripeColor = "F3F4F6";
  const borderStyle = { style: "thin", color: { rgb: "E5E7EB" } };

  const baseStyle = {
    font: { name: "Calibri", sz: 11 },
    alignment: { vertical: "center", wrapText: false },
    border: {
      top: borderStyle,
      bottom: borderStyle,
      left: borderStyle,
      right: borderStyle,
    },
  };

  const headerStyle = {
    ...baseStyle,
    fill: { fgColor: { rgb: headerColor } },
    font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: "center", vertical: "center" },
  };

  const stripeStyle = {
    ...baseStyle,
    fill: { fgColor: { rgb: stripeColor } },
  };

  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
  const colWidths: { wch: number }[] = [];

  const startRow = headerOffset;

  if (options?.onSheetCreated) {
    options.onSheetCreated(worksheet, range, XLSX.utils, headerOffset + 1);
  }

  for (let C = range.s.c; C <= range.e.c; ++C) {
    let maxWidth = 12;

    for (let R = 0; R <= range.e.r; ++R) {
      const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
      const cell = worksheet[cellAddress];

      if (cell) {
        if (typeof cell.v === "object" && cell.v !== null && "t" in cell.v) {
          if ((cell.v as any).r) cell.r = (cell.v as any).r;
          cell.v = (cell.v as any).t;
          cell.t = "s";
        }

        if (R < startRow) {
          const hasRichText = !!(cell.r && cell.r.length > 0);
          cell.s = {
            font: { name: "Calibri", sz: 11, bold: !hasRichText },
            alignment: { vertical: "center", horizontal: "center" },
          };
        } else if (R === startRow) {
          cell.s = headerStyle;
        } else {
          cell.s = (R - startRow) % 2 === 0 ? stripeStyle : baseStyle;
        }

        if (R >= startRow && cell.v != null) {
          const cellLength = String(cell.v).length + 2;
          if (cellLength > maxWidth) maxWidth = cellLength;
        }
      }
    }
    colWidths.push({ wch: maxWidth });
  }

  worksheet["!cols"] = colWidths;

  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: headerOffset, c: 0 },
      e: range.e,
    }),
  };

  worksheet["!margins"] = {
    left: 0.25,
    right: 0.25,
    top: 0.75,
    bottom: 0.75,
    header: 0.3,
    footer: 0.3,
  };
  worksheet["!pageSetup"] = {
    orientation: "landscape",
    paperSize: 1,
    fitToPage: true,
    fitToWidth: 1,
  };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  const dateStr = dayjs().format("YYYY-MM-DD");
  XLSX.writeFile(workbook, `${fileName}_${dateStr}.xlsx`);
};
