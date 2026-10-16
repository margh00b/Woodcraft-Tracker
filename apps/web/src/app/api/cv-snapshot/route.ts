import { NextResponse } from "next/server";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

export async function GET() {
  try {
    const scriptPath = "C:\\WCKCTracker\\wckc\\CVhelper\\get-cv-snapshot.ps1";

    const { stdout, stderr } = await execPromise(
      `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`,
    );

    if (stderr && !stdout) {
      return NextResponse.json({ error: stderr }, { status: 500 });
    }

    try {
      const data = JSON.parse(stdout.trim());
      return NextResponse.json({ success: true, data });
    } catch (parseError) {
      return NextResponse.json(
        {
          error: "PowerShell outputted non-JSON text.",
          rawOutput: stdout.trim(),
        },
        { status: 500 },
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to execute PowerShell script" },
      { status: 500 },
    );
  }
}
