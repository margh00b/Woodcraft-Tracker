import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const cleanupSecret = Deno.env.get("INSTALL_REPORT_CLEANUP_SECRET");

  if (!cleanupSecret || req.headers.get("x-cleanup-secret") !== cleanupSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { paths } = await req.json();

    if (
      !Array.isArray(paths) ||
      paths.some((path) => typeof path !== "string")
    ) {
      return new Response("Invalid paths", { status: 400 });
    }

    if (paths.length === 0) {
      return new Response("No files to delete", { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await supabase.storage.from("job_files").remove(paths);

    if (error) {
      console.error("Storage cleanup failed:", error);
      return new Response("Storage cleanup failed", { status: 500 });
    }

    return new Response(
      JSON.stringify({ success: true, deleted: paths.length }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Cleanup function error:", error);
    return new Response("Internal server error", { status: 500 });
  }
});
