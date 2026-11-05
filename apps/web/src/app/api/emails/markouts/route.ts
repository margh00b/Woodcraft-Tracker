import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMarkoutShareToken } from "@/lib/markout-share";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessToken = authorization.slice(7);
    const supabase = createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 },
      );
    }
    const role = user.app_metadata?.role;

    if (!["admin", "installer", "markouts"].includes(role)) {
      return NextResponse.json(
        { error: "You are not authorized to share markout reports." },
        { status: 403 },
      );
    }
    const body = await request.json();
    const markoutId = Number(body.markoutId);
    const sitesuperEmail =
      typeof body.sitesuperEmail === "string"
        ? body.sitesuperEmail.trim().toLowerCase()
        : null;

    if (!Number.isSafeInteger(markoutId) || markoutId <= 0) {
      return NextResponse.json(
        { error: "Invalid markout ID" },
        { status: 400 },
      );
    }

    const { data: markout, error: markoutError } = await supabase
      .schema("insite")
      .from("markouts")
      .select("id, job_id")
      .eq("id", markoutId)
      .maybeSingle();

    if (markoutError || !markout) {
      return NextResponse.json({ error: "Markout not found" }, { status: 404 });
    }

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("sales_order_id")
      .eq("id", markout.job_id)
      .maybeSingle();

    if (jobError || !job?.sales_order_id) {
      console.error("Job lookup failed:", jobError);

      return NextResponse.json(
        { error: "Associated job or sales order not found" },
        { status: 404 },
      );
    }

    const { data: salesOrder, error: salesOrderError } = await supabase
      .from("sales_orders")
      .select(
        "designer, shipping_street, shipping_city, shipping_province, shipping_zip",
      )
      .eq("id", job.sales_order_id)
      .maybeSingle();

    if (salesOrderError || !salesOrder) {
      console.error("Sales order lookup failed:", salesOrderError);

      return NextResponse.json(
        { error: "Associated sales order not found" },
        { status: 404 },
      );
    }

    const designerUsername = salesOrder.designer?.trim().toLowerCase();

    if (!designerUsername) {
      return NextResponse.json(
        { error: "The associated sales order has no designer assigned." },
        { status: 400 },
      );
    }

    type AuthUserWithMetadata = {
      user_metadata: Record<string, unknown>;
    };

    let designerEmail: string | null = null;
    let page = 1;

    while (!designerEmail) {
      const { data: users, error: usersError } =
        await supabase.auth.admin.listUsers({
          page,
          perPage: 1000,
        });

      if (usersError) {
        console.error("Designer lookup failed:", usersError);

        return NextResponse.json(
          { error: "Unable to retrieve the designer's email." },
          { status: 500 },
        );
      }

      const authUsers = users.users as unknown as AuthUserWithMetadata[];

      const designer = authUsers.find((user) => {
        const username = user.user_metadata.username;

        return (
          typeof username === "string" &&
          username.trim().toLowerCase() === designerUsername
        );
      });

      if (designer) {
        const outlookEmail = designer.user_metadata.outlook_email;

        designerEmail =
          typeof outlookEmail === "string"
            ? outlookEmail.trim().toLowerCase()
            : null;

        break;
      }

      if (authUsers.length < 1000) break;

      page++;
    }

    if (!designerEmail) {
      return NextResponse.json(
        {
          error: `No Outlook email found for designer "${designerUsername}".`,
        },
        { status: 400 },
      );
    }
    const address = [
      salesOrder.shipping_street,
      salesOrder.shipping_city,
      salesOrder.shipping_province,
      salesOrder.shipping_zip,
    ]
      .filter(Boolean)
      .join(", ");
    const { token, expiresAt } = await createMarkoutShareToken(
      markout.id,
      "delivered@resend.dev",
    );

    const appUrl =
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : "https://core.woodcraftkc.com";

    const shareUrl = `${appUrl}/external/markout/${token}`;

    const FROM_DEV = "Acme <onboarding@resend.dev>";
    const TO_DEV = ["delivered@resend.dev"];
    const FROM_PROD = "Woodcraft KC <notifications@woodcraftkc.com>";
    const MARKOUTS_TO_PROD = [designerEmail, sitesuperEmail].filter(
      (email): email is string =>
        typeof email === "string" && email.trim().length > 0,
    );
    const REPLY_TO = "install@woodcraftkc.com";

    const { data, error: emailError } = await resend.emails.send({
      from: FROM_PROD,
      replyTo: REPLY_TO,
      to: MARKOUTS_TO_PROD,
      subject: `Markout Report - ${address}`,

      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f5f9;
      -webkit-font-smoothing: antialiased;
    }

    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }

      .content {
        padding: 32px 24px !important;
      }

      .header {
        padding: 38px 24px !important;
      }

      .view-button {
        display: block !important;
        padding: 17px 20px !important;
      }
    }
  </style>
</head>

<body>
  <div style="background-color: #f4f5f9; padding: 40px 16px; font-family: Arial, Helvetica, sans-serif;">

    <table
      class="email-container"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 30px rgba(30, 41, 59, 0.08);"
    >

      <!-- Header -->
      <tr>
        <td
          class="header"
          align="center"
          style="padding: 42px 32px; background-color: #4c1d95; background-image: linear-gradient(135deg, #4c1d95 0%, #6d28d9 55%, #7c3aed 100%);"
        >
          <p style="margin: 0 0 12px; color: #ddd6fe; font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase;">
            Woodcraft Kitchen Cabinets
          </p>

          <h1 style="margin: 0; color: #ffffff; font-size: 30px; line-height: 1.25; font-weight: 700; letter-spacing: -0.5px;">
            Markout Report
          </h1>
        </td>
      </tr>

      <!-- Accent line -->
      <tr>
        <td style="height: 4px; background-color: #f59e0b; font-size: 0; line-height: 0;">
          &nbsp;
        </td>
      </tr>

      <!-- Content -->
      <tr>
        <td class="content" style="padding: 40px 42px 36px; color: #334155;">

          <h2 style="margin: 0 0 14px; color: #111827; font-size: 21px; line-height: 1.4; font-weight: 700;">
            Hello,
          </h2>

          <p style="margin: 0 0 30px; color: #64748b; font-size: 15px; line-height: 1.8;">
            A new markout report has been submitted and is now available for your review. You can access the project details and attached photos using the secure link below.
          </p>

          <!-- Project details -->
          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="margin-bottom: 32px; background-color: #faf8ff; border: 1px solid #e9ddff; border-radius: 10px;"
          >
            <tr>
              <td style="padding: 20px 22px; border-left: 4px solid #7c3aed;">

                <p style="margin: 0 0 9px; color: #7c3aed; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">
                  Project Address
                </p>

                <p style="margin: 0; color: #1e293b; font-size: 17px; font-weight: 700; line-height: 1.6; overflow-wrap: anywhere;">
                  ${address}
                </p>

              </td>
            </tr>
          </table>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
            <tr>
              <td align="center">
                <a
                  href="${shareUrl}"
                  class="view-button"
                  style="display: inline-block; padding: 17px 38px; background-color: #6d28d9; background-image: linear-gradient(135deg, #6d28d9, #7c3aed); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 700; letter-spacing: 0.5px; text-align: center;"
                >
                  VIEW MARKOUT REPORT &nbsp; &#8594;
                </a>
              </td>
            </tr>
          </table>

          <!-- Expiry notice -->
          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 9px;"
          >
            <tr>
              <td style="padding: 17px 19px;">

                <p style="margin: 0 0 7px; color: #92400e; font-size: 13px; font-weight: 700;">
                  &#128274; Secure, time-limited access
                </p>

                <p style="margin: 0; color: #78350f; font-size: 12px; line-height: 1.7;">
                  This private link expires on
                  <strong>${new Date(expiresAt).toLocaleDateString("en-CA", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    timeZone: "America/Edmonton",
                  })}</strong>.
                  Anyone with this link can view the report until it expires or access is revoked.
                </p>

              </td>
            </tr>
          </table>

          <p style="margin: 30px 0 0; color: #94a3b8; font-size: 12px; line-height: 1.7; text-align: center;">
            If you have any questions regarding this report, please contact Woodcraft Kitchen Cabinets.
          </p>

        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td align="center" style="padding: 23px 20px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">

          <p style="margin: 0; color: #475569; font-size: 13px; font-weight: 700;">
            Woodcraft Kitchen Cabinets
          </p>

          <p style="margin: 7px 0 0; color: #94a3b8; font-size: 11px; line-height: 1.5;">
            Automated notification &bull; Please do not reply to this email.
          </p>

        </td>
      </tr>

    </table>
  </div>
</body>
</html>
`,
    });

    if (emailError) {
      console.error("Markout email error:", emailError);

      return NextResponse.json(
        {
          error: emailError.message,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      expiresAt,
      emailId: data?.id,
    });
  } catch (error) {
    console.error("Markout sharing error:", error);

    return NextResponse.json(
      { error: "Unable to create or send the markout share link." },
      { status: 500 },
    );
  }
}
