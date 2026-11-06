import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized: Missing or invalid authorization header" },
        { status: 401 },
      );
    }

    const token = authHeader.split(" ")[1];

    const supabase = createAdminClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or expired token" },
        { status: 401 },
      );
    }

    const installerName =
      user.user_metadata?.username ||
      user.email?.split("@")[0] ||
      "Unknown User";

    const { reportId, jobId, jobNumber } = await request.json();

    if (!reportId || !jobId) {
      return NextResponse.json(
        { error: "Missing required fields: reportId or jobId" },
        { status: 400 },
      );
    }

    const cleanJobNumber = jobNumber
      ? String(jobNumber).replace(/[^0-9]+$/, "")
      : jobId;

    console.log(
      `[EMAIL API] Received request for Report ID: ${reportId} on Job: ${jobId} securely from ${installerName}`,
    );

    const appUrl =
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : "https://core.woodcraftkc.com";

    const dashboardLink = `${appUrl}/dashboard/install-reports?jobId=${jobId}&fromResend=${true}&reportId=${reportId}`;

    const FROM_DEV = "Acme <onboarding@resend.dev>";
    const TO_DEV = ["delivered@resend.dev"];
    const TO_PROD = ["install@woodcraftkc.com"];
    const FROM_PROD = "Woodcraft KC <notifications@woodcraftkc.com>";

    const data = await resend.emails.send({
      from: FROM_PROD,
      to: TO_PROD,
      subject: `Job # ${cleanJobNumber} - New Install Report`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>

<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1f5f9">
    <tr>
      <td align="center" style="padding:40px 15px;">

        <!-- Main Container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0"
          style="width:100%; max-width:600px; background-color:#ffffff; border-radius:12px; overflow:hidden;">

          <!-- Header -->
          <tr>
            <td align="center" bgcolor="#6d28d9"
              style="padding:40px 25px; background-color:#6d28d9;">

              <h1 style="margin:0; color:#ffffff; font-size:28px; font-weight:bold;">
                Installation Report
              </h1>

              <p style="margin:12px 0 0; color:#ede9fe; font-size:15px;">
                Ready for your review
              </p>

            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px 35px; color:#334155;">

              <p style="margin:0 0 20px; color:#0f172a; font-size:18px; font-weight:bold;">
                Hello team,
              </p>

              <p style="margin:0 0 30px; color:#475569; font-size:15px; line-height:25px;">
                A new installation report has been submitted to the system.
                The job details and attachments are ready for your review.
              </p>

              <!-- Job Details -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                bgcolor="#f5f3ff"
                style="background-color:#f5f3ff; border-left:4px solid #7c3aed;">

                <tr>
                  <td style="padding:22px 24px;">

                    <p style="margin:0 0 8px; color:#64748b; font-size:12px; font-weight:bold; letter-spacing:1px;">
                      JOB NUMBER
                    </p>

                    <p style="margin:0 0 22px; color:#6d28d9; font-size:22px; font-weight:bold;">
                      ${cleanJobNumber}
                    </p>

                    <p style="margin:0 0 8px; color:#64748b; font-size:12px; font-weight:bold; letter-spacing:1px;">
                      INSTALLER
                    </p>

                    <p style="margin:0; color:#0f172a; font-size:16px; font-weight:bold;">
                      ${installerName}
                    </p>

                  </td>
                </tr>
              </table>

              <!-- Dashboard Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:35px 0 15px;">

                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="#6d28d9"
                          style="background-color:#6d28d9; border-radius:6px;">

                          <a href="${dashboardLink}"
                            style="display:inline-block; padding:15px 35px; color:#ffffff; font-size:15px; font-weight:bold; text-decoration:none;">
                            OPEN DASHBOARD
                          </a>

                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:25px 0 20px;">
                    <div style="border-top:1px solid #e2e8f0; font-size:0; line-height:0;">
                      &nbsp;
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">

                    <p style="margin:0 0 10px; color:#334155; font-size:14px; font-weight:bold;">
                      Woodcraft Kitchen Cabinets
                    </p>

                    <p style="margin:0; color:#94a3b8; font-size:12px;">
                      System ID:
                      <span style="color:#6d28d9; font-family:Arial, Helvetica, sans-serif; font-weight:bold;">
                        ${reportId}
                      </span>
                    </p>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>

        <!-- Outer Footer -->
        <p style="margin:25px 0 0; color:#94a3b8; font-size:11px; letter-spacing:1px; text-align:center;">
          SECURE AUTOMATED SYSTEM NOTIFICATION
        </p>

      </td>
    </tr>
  </table>

</body>
</html>
`,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Email error:", error);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
