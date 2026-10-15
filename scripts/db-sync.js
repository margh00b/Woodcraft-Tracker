const { execSync } = require('child_process');

require('dotenv').config(); 

const args = process.argv.slice(2);
const devOnly = args.includes('-devonly');
const prodOnly = args.includes('-prodonly');

const TEST_DB_URL = process.env.DATABASE_URL_DEV; 
const PROD_DB_URL = process.env.DATABASE_URL_PROD;


const cmdLocalUp = `npx supabase migration up`;

const cmdGenTypes = `npx supabase gen types typescript --local --schema public,insite > src/types/supabase.ts`;

const cmdPushDev = `npx supabase db push --db-url "${TEST_DB_URL}"`;

const cmdPushProd = `npx supabase db push --db-url "${PROD_DB_URL}"`;

const run = (name, command) => {
  console.log(`[${name}] Starting...`);
  try {
    execSync(command, { stdio: 'inherit', shell: true });
    console.log(`[${name}] Complete.`);
  } catch (error) {
    console.error(`[${name}] Failed.`);
    process.exit(1);
  }
};

(async () => {
  if ((devOnly || !prodOnly) && !TEST_DB_URL) {
    console.error("Error: TEST_DB_URL is missing from .env");
    process.exit(1);
  }
  if ((prodOnly || !devOnly) && !PROD_DB_URL) {
    console.error("Error: PROD_DB_URL is missing from .env");
    process.exit(1);
  }

  if (prodOnly) {
    console.log("Deploying ONLY to PRODUCTION...");
    run("Push to Production", cmdPushProd);
    return;
  }

  if (devOnly) {
    console.log("Deploying ONLY to TEST/DEV...");
    run("Update Local DB", cmdLocalUp);
    run("Generate Types", cmdGenTypes);
    run("Push to Remote Dev", cmdPushDev);
    return;
  }

  console.log("Starting Full Sync (Local -> Dev -> Prod)...");
  
  run("Update Local DB", cmdLocalUp);
  run("Generate Types", cmdGenTypes);
  run("Push to Remote Dev", cmdPushDev);
  
  console.log("Test DB updated. Pushing to Production...");
  run("Push to Production", cmdPushProd);

})();