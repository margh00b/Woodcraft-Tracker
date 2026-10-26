import "dotenv/config";
import { createClient, type User } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { resolve } from "node:path";

type SourceUser = {
  clerkId: string;
  username: string;
  role: string;
  subRole: string | null;
  password: string;
  email: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

const workbookPath = resolve(
  process.env.CLERK_USERS_XLSX ?? "./clerk_users.xlsx",
);

const dryRun = process.argv.includes("--dry-run");

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY.");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

function required(value: unknown, field: string, row: number): string {
  if (value == null || String(value).trim() === "") {
    throw new Error(`Row ${row}: missing ${field}.`);
  }

  return String(value).trim();
}

function readUsers(): SourceUser[] {
  const workbook = XLSX.readFile(workbookPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!sheet) {
    throw new Error("No worksheet found.");
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
  });

  if (rows.length === 0) {
    throw new Error("No users found in spreadsheet.");
  }

  for (const column of [
    "User ID",
    "Username",
    "Role",
    "Sub-Role",
    "Password",
  ]) {
    if (!(column in rows[0])) {
      throw new Error(`Missing column: ${column}`);
    }
  }

  const users = rows.map((row, index): SourceUser => {
    const rowNumber = index + 2;
    const username = required(
      row["Username"],
      "Username",
      rowNumber,
    ).toLowerCase();

    if (!/^[a-z0-9][a-z0-9._-]{0,62}$/.test(username)) {
      throw new Error(`Row ${rowNumber}: invalid username "${username}".`);
    }

    const passwordValue = row["Password"];

    if (passwordValue == null || String(passwordValue).length === 0) {
      throw new Error(`Row ${rowNumber}: missing password.`);
    }

    const subRoleValue = row["Sub-Role"];

    return {
      clerkId: required(row["User ID"], "User ID", rowNumber),
      username,
      role: required(row["Role"], "Role", rowNumber),
      subRole:
        subRoleValue == null || String(subRoleValue).trim() === ""
          ? null
          : String(subRoleValue).trim(),
      password: String(passwordValue),
      email: `${username}@auth.woodcraftkc.com`,
    };
  });

  const ids = new Set<string>();
  const usernames = new Set<string>();

  for (const user of users) {
    if (ids.has(user.clerkId)) {
      throw new Error(`Duplicate Clerk ID: ${user.clerkId}`);
    }

    if (usernames.has(user.username)) {
      throw new Error(`Duplicate username: ${user.username}`);
    }

    ids.add(user.clerkId);
    usernames.add(user.username);
  }

  return users;
}

async function listAllUsers(): Promise<User[]> {
  const users: User[] = [];
  const perPage = 1000;

  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    console.log({
      success: !error,
      error: error?.message,
      usersReturned: data?.users.length,
    });
    if (error) {
      throw new Error(`Failed to list Supabase users: ${error.message}`);
    }

    users.push(...data.users);

    if (data.users.length < perPage) {
      return users;
    }
  }
}

async function main() {
  const sourceUsers = readUsers();

  console.log(`Validated ${sourceUsers.length} users.`);

  if (dryRun) {
    for (const user of sourceUsers) {
      console.log(`Would migrate ${user.username} -> ${user.email}`);
    }

    console.log("Dry run complete. No users created.");
    return;
  }

  const existingUsers = await listAllUsers();

  const byEmail = new Map(
    existingUsers
      .filter((user) => user.email)
      .map((user) => [user.email!.toLowerCase(), user]),
  );

  let created = 0;
  let skipped = 0;

  for (const source of sourceUsers) {
    const existing = byEmail.get(source.email.toLowerCase());

    if (existing) {
      if (existing.app_metadata?.clerk_id !== source.clerkId) {
        throw new Error(
          `Email ${source.email} already belongs to a different user. Stopping.`,
        );
      }

      console.log(`Already migrated: ${source.username}`);
      skipped++;
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: source.email,
      password: source.password,
      email_confirm: true,
      user_metadata: {
        username: source.username,
        timezone: "America/Edmonton",
      },
      app_metadata: {
        clerk_id: source.clerkId,
        role: source.role,
        sub_role: source.subRole,
      },
    });

    if (error || !data.user) {
      throw new Error(
        `Failed to migrate ${source.username}: ${
          error?.message ?? "No user returned"
        }`,
      );
    }

    byEmail.set(source.email.toLowerCase(), data.user);
    created++;

    console.log(`Created: ${source.username}`);
  }

  console.log(
    `Migration complete. Created: ${created}; skipped: ${skipped}; total: ${sourceUsers.length}.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Migration failed.");
  process.exitCode = 1;
});
