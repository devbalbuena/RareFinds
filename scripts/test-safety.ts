import "dotenv/config";

/**
 * Enforces strict isolation for automated test scripts.
 * Refuses execution if TEST_DATABASE_URL is missing or matches the main DATABASE_URL/DIRECT_URL.
 */
export function enforceTestDatabaseIsolation(): string {
  const testUrl = process.env.TEST_DATABASE_URL?.trim();
  const mainUrl = process.env.DATABASE_URL?.trim();
  const directUrl = process.env.DIRECT_URL?.trim();

  if (!testUrl) {
    console.error(
      "\n======================================================================\n" +
      "❌ CRITICAL SAFETY VIOLATION: Automated tests require an isolated DB.\n" +
      "======================================================================\n" +
      "Automated test scripts are strictly forbidden from running against\n" +
      "the main development or live database.\n\n" +
      "To run automated test scripts:\n" +
      "1. Provision a separate Supabase project or isolated test database.\n" +
      "2. Add TEST_DATABASE_URL to your .env file.\n" +
      "3. Run `npx prisma db push` with TEST_DATABASE_URL to setup tables.\n" +
      "======================================================================\n"
    );
    process.exit(1);
  }

  if (
    (mainUrl && testUrl === mainUrl) ||
    (directUrl && testUrl === directUrl)
  ) {
    console.error(
      "\n======================================================================\n" +
      "❌ CRITICAL SAFETY VIOLATION: TEST_DATABASE_URL matches DATABASE_URL!\n" +
      "======================================================================\n" +
      "TEST_DATABASE_URL cannot be identical to DATABASE_URL or DIRECT_URL.\n" +
      "Tests mutate, create, and drop database records, and are forbidden from\n" +
      "touching your real catalog or user data.\n" +
      "======================================================================\n"
    );
    process.exit(1);
  }

  // Override DATABASE_URL and DIRECT_URL in the process environment
  // so any application modules importing src/lib/prisma use the test database
  process.env.DATABASE_URL = testUrl;
  if (process.env.DIRECT_URL) {
    process.env.DIRECT_URL = testUrl;
  }

  return testUrl;
}
