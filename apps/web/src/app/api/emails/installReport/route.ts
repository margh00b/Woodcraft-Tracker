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

    const data = await resend.emails.send({
      from: "Acme <onboarding@resend.dev>",
      to: ["delivered@resend.dev"],
      subject: `New Install Report - Job # ${cleanJobNumber}`,
      html: `
<!DOCTYPE html>
<html>
<head>
<style>
  @keyframes gradientFlow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  @keyframes slideUpFade {
    0% { opacity: 0; transform: translateY(30px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  @keyframes pulseGlow {
    0% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.7); }
    70% { box-shadow: 0 0 0 15px rgba(168, 85, 247, 0); }
    100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0); }
  }

  @keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-5px); }
    100% { transform: translateY(0px); }
  }

  .animate-bg {
    background: linear-gradient(-45deg, #9333ea, #4f46e5, #ec4899, #8b5cf6);
    background-size: 300% 300%;
    animation: gradientFlow 6s ease infinite;
  }

  .animate-entrance {
    animation: slideUpFade 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .animate-pulse-btn {
    animation: pulseGlow 2s infinite;
    transition: all 0.3s ease;
  }

  .animate-pulse-btn:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 15px 30px -5px rgba(147, 51, 234, 0.6);
  }

  .hover-card {
    transition: all 0.4s ease;
  }
  
  .hover-card:hover {
    transform: translateX(5px);
    box-shadow: inset 0 0 0 2px rgba(168, 85, 247, 0.4), 0 10px 20px -10px rgba(147, 51, 234, 0.2);
  }
</style>
</head>
<body style="margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">

  <!-- Outer Background with subtle movement -->
  <div style="background: radial-gradient(circle at top left, #f3e8ff 0%, #e0e7ff 50%, #faf5ff 100%); padding: 60px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100vh;">
    
    <!-- Main Card -->
    <div class="animate-entrance" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(109, 40, 217, 0.25), 0 0 0 1px rgba(168, 85, 247, 0.1);">
      
      <!-- Liquid Gradient Header -->
      <div class="animate-bg" style="padding: 50px 32px; text-align: center; position: relative; overflow: hidden;">
        <div style="position: relative; z-index: 2; animation: float 4s ease-in-out infinite;">
          <h2 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: -1px; text-shadow: 0 4px 12px rgba(0,0,0,0.2);">
            Installation Report
          </h2>
          <p style="margin: 12px 0 0 0; color: #f8fafc; font-size: 16px; font-weight: 500; opacity: 0.95; letter-spacing: 0.5px;">
            Ready for your review ✨
          </p>
        </div>
      </div>
      
      <!-- Content Area -->
      <div style="padding: 48px 40px; color: #334155; background: linear-gradient(180deg, #ffffff 0%, #fdfcff 100%);">
        
        <p style="font-size: 18px; margin-top: 0; color: #0f172a; font-weight: 700;">Hello team,</p>
        
        <p style="font-size: 16px; line-height: 1.7; margin-bottom: 36px; color: #475569;">
          A new installation report has just been submitted to the system. The details of the job have been processed and are ready for your immediate review.
        </p>
        
        <!-- Interactive Details Card -->
        <div class="hover-card" style="background: linear-gradient(135deg, #faf5ff 0%, #ffffff 100%); border-left: 5px solid #a855f7; border-radius: 12px; padding: 28px; margin-bottom: 48px; box-shadow: inset 0 0 0 1px rgba(147, 51, 234, 0.15), 0 4px 6px -1px rgba(0,0,0,0.05);">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 16px;">
            <tr>
              <td style="padding-bottom: 20px; color: #64748b; font-weight: 600; width: 120px; text-transform: uppercase; font-size: 13px; letter-spacing: 1px;">Job Number</td>
              <td style="padding-bottom: 20px; font-weight: 800; color: #6d28d9; font-size: 20px;">${cleanJobNumber}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 13px; letter-spacing: 1px;">Installer</td>
              <td style="font-weight: 700; color: #0f172a; font-size: 17px;">${installerName}</td>
            </tr>
          </table>
        </div>
        
        <!-- Animated Pulsing Button -->
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${dashboardLink}" class="animate-bg animate-pulse-btn" style="color: #ffffff; padding: 18px 48px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px; display: inline-block; text-transform: uppercase; letter-spacing: 1px;">
            Open Dashboard
          </a>
        </div>
        
        <hr style="border: 0; border-top: 2px dashed #e2e8f0; margin: 48px 0 32px;" />
        
        <!-- Footer -->
        <div style="text-align: center;">
          <p style="font-size: 15px; color: #475569; margin: 0 0 10px 0; font-weight: 700;">
            Woodcraft Kitchen Cabinets
          </p>
          <p style="font-size: 13px; color: #94a3b8; margin: 0;">
            System ID: <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background-color: #f1f5f9; padding: 4px 8px; border-radius: 6px; color: #6d28d9; font-weight: 600;">${reportId}</span>
          </p>
        </div>
      </div>

    </div>
    
    <!-- Outer float footer -->
    <div style="text-align: center; padding-top: 30px; color: #a855f7; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; opacity: 0.8;">
      SECURE AUTOMATED SYSTEM NOTIFICATION
    </div>
  </div>

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
