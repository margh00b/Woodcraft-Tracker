import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { Readable } from "stream";
import {
  PastShippingReportPdf,
  PastShippingJob,
} from "@/documents/PastShipReportPdf";

export async function POST(req: NextRequest) {
  const reqId = Math.random().toString(36).substring(7);

  try {
    const body = await req.json();

    const { data, startDate, endDate } = body as {
      data: PastShippingJob[];
      startDate: string | null;
      endDate: string | null;
    };
    const stream = await renderToStream(
      <PastShippingReportPdf
        data={data}
        startDate={startDate ? new Date(startDate) : null}
        endDate={endDate ? new Date(endDate) : null}
      />,
    );

    const webStream = Readable.toWeb(stream as Readable) as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    return new NextResponse("Error generating PDF", { status: 500 });
  }
}
