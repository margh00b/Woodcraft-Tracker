import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const DEFAULT_ROLES = [
  "admin",
  "designer",
  "plant",
  "manager",
  "inspection",
  "installation",
  "scheduler",
  "reception",
  "service",
];

const DEFAULT_SUB_ROLES = ["assembly", "paint", "manager", "shipments", "wood"];

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeValue(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();

  if (!normalized || normalized.length > 60) return null;

  if (!/^[a-z0-9_-]+$/.test(normalized)) return null;

  return normalized;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: jsonError("Authentication required.", 401) };
  }

  if (user.app_metadata?.role !== "admin") {
    return { error: jsonError("Administrator access required.", 403) };
  }

  return { user };
}

function isPasswordValid(password: unknown): password is string {
  return (
    typeof password === "string" &&
    password.length >= 6 &&
    password.length <= 128
  );
}

export async function GET(request: NextRequest) {
  const authorization = await requireAdmin();

  if ("error" in authorization) return authorization.error;

  const page = Math.max(
    1,
    Number.parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10) || 1,
  );

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.listUsers({
    page,
    perPage: 100,
  });

  if (error) {
    return jsonError("Unable to load users.", 500);
  }

  const users = data.users.map((user) => ({
    id: user.id,
    email: user.email,
    username: user.user_metadata?.username ?? "",
    role: user.app_metadata?.role ?? "",
    sub_role: user.app_metadata?.sub_role ?? null,
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at,
    banned_until: user.banned_until,
  }));

  return NextResponse.json({
    users,
    page,
    hasMore: data.users.length === 100,
  });
}

export async function POST(request: NextRequest) {
  const authorization = await requireAdmin();

  if ("error" in authorization) return authorization.error;

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const username =
    typeof body.username === "string" ? body.username.trim().toLowerCase() : "";

  if (!/^[a-z0-9][a-z0-9._-]{1,39}$/.test(username)) {
    return jsonError(
      "Username must be 2–40 characters and use letters, numbers, dots, underscores, or hyphens.",
      400,
    );
  }

  if (!isPasswordValid(body.password)) {
    return jsonError("Password must be between 12 and 128 characters.", 400);
  }

  const role = normalizeValue(body.role);
  const subRole =
    body.sub_role === "" || body.sub_role === null
      ? null
      : normalizeValue(body.sub_role);

  if (!role) return jsonError("A valid role is required.", 400);

  if (body.sub_role && !subRole) {
    return jsonError("Invalid sub-role.", 400);
  }

  const email = `${username}@auth.woodcraftkc.com`;
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: body.password,
    email_confirm: true,
    app_metadata: {
      role,
      sub_role: subRole,
    },
    user_metadata: {
      username,
      timezone: "America/Edmonton",
    },
  });

  if (error) {
    return jsonError(error.message, 400);
  }

  return NextResponse.json(
    {
      user: {
        id: data.user.id,
        email: data.user.email,
        username: data.user.user_metadata?.username ?? username,
        role: data.user.app_metadata?.role ?? role,
        sub_role: data.user.app_metadata?.sub_role ?? null,
        created_at: data.user.created_at,
      },
    },
    { status: 201 },
  );
}

export async function PATCH(request: NextRequest) {
  const authorization = await requireAdmin();

  if ("error" in authorization) return authorization.error;

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const id = typeof body.id === "string" ? body.id : "";

  if (!id) return jsonError("User ID is required.", 400);

  const admin = createAdminClient();

  const { data: existing, error: lookupError } =
    await admin.auth.admin.getUserById(id);

  if (lookupError || !existing.user) {
    return jsonError("User not found.", 404);
  }

  const metadata = { ...existing.user.app_metadata };

  if (Object.hasOwn(body, "role")) {
    const role = normalizeValue(body.role);

    if (!role) return jsonError("A valid role is required.", 400);

    metadata.role = role;
  }

  if (Object.hasOwn(body, "sub_role")) {
    if (body.sub_role === null || body.sub_role === "") {
      delete metadata.sub_role;
    } else {
      const subRole = normalizeValue(body.sub_role);

      if (!subRole) return jsonError("Invalid sub-role.", 400);

      metadata.sub_role = subRole;
    }
  }

  const updates: {
    app_metadata?: Record<string, unknown>;
    password?: string;
  } = {};

  if (Object.hasOwn(body, "role") || Object.hasOwn(body, "sub_role")) {
    updates.app_metadata = metadata;
  }

  if (Object.hasOwn(body, "password")) {
    if (!isPasswordValid(body.password)) {
      return jsonError("Password must be between 12 and 128 characters.", 400);
    }

    updates.password = body.password;
  }

  if (Object.keys(updates).length === 0) {
    return jsonError("No supported changes supplied.", 400);
  }

  const { data, error } = await admin.auth.admin.updateUserById(id, updates);

  if (error) {
    return jsonError(error.message, 400);
  }

  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      username: data.user.user_metadata?.username ?? "",
      role: data.user.app_metadata?.role ?? "",
      sub_role: data.user.app_metadata?.sub_role ?? null,
    },
  });
}
