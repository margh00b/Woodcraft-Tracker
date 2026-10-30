import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const secret = request.headers.get("x-app-secret");
  if (secret !== process.env.SUPER_SECRET) {
    return NextResponse.json(
      { error: "Forbidden bcz super secret my friend!" },
      { status: 403 },
    );
  }

  try {
    const { reportId, installerName, jobId, jobNumber } = await request.json();
    const cleanJobNumber = jobNumber
      ? String(jobNumber).replace(/[^0-9]+$/, "")
      : jobId;
    console.log(
      `[EMAIL API] Received request for Report ID: ${reportId} on Job: ${jobId} from ${installerName}`,
    );

    const appUrl =
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : "https://your-production-web-app.com";

    const dashboardLink = `${appUrl}/dashboard/installation-reports?jobId=${jobId}&fromResend=${true}&reportId=${reportId}`;

    const data = await resend.emails.send({
      from: "Acme <onboarding@resend.dev>",
      to: ["delivered@resend.dev"],
      subject: `New Install Report - Job # ${cleanJobNumber}`,
      html: `
        <div style="background-color: #f8fafc; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            
            <div style="background-color: #4f46e5; padding: 32px 24px; text-align: center;">
              <h2 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                Installation Report
              </h2>
            </div>
            
            <div style="padding: 40px 32px; color: #334155;">
              <p style="font-size: 16px; margin-top: 0; color: #475569;">Hello team,</p>
              
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                A new installation report has just been submitted and is ready for review.
              </p>
              
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 32px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 15px;">
                  <tr>
                    <td style="padding-bottom: 12px; color: #64748b; font-weight: 500; width: 120px;">Job Number:</td>
                    <td style="padding-bottom: 12px; font-weight: 700; color: #0f172a;">${cleanJobNumber}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; font-weight: 500;">Installer:</td>
                    <td style="font-weight: 700; color: #0f172a;">${installerName}</td>
                  </tr>
                </table>
              </div>
              
              <div style="text-align: center; margin-bottom: 16px;">
                <a href="${dashboardLink}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                  Open Dashboard
                </a>
              </div>
              
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 40px 0 24px;" />
              
              <p style="font-size: 13px; color: #94a3b8; margin: 0; text-align: center; line-height: 1.5;">
                Woodcraft Kitchen Cabinets<br/>
                System ID: <span style="font-family: monospace;">${reportId}</span>
              </p>
            </div>

          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Email error:", error);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
