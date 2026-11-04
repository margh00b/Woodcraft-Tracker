import "server-only";

import { createHash, randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const TOKEN_EXPIRY_DAYS = 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createMarkoutShareToken(
  markoutId: number,
  recipientEmail: string,
) {
  const supabase = createAdminClient();

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);

  const expiresAt = new Date(
    Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error } = await supabase
    .schema("insite")
    .from("markout_share_tokens")
    .upsert(
      {
        markout_id: markoutId,
        token_hash: tokenHash,
        recipient_email: recipientEmail.trim().toLowerCase(),
        expires_at: expiresAt,
        revoked_at: null,
      },
      { onConflict: "markout_id" },
    );

  if (error) {
    throw new Error(`Failed to create markout access token: ${error.message}`);
  }

  return {
    token,
    expiresAt,
  };
}

export async function revokeMarkoutShareToken(markoutId: number) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .schema("insite")
    .from("markout_share_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("markout_id", markoutId);

  if (error) {
    throw new Error(`Failed to revoke markout access: ${error.message}`);
  }
}
