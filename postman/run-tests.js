// =============================================================================
// Workly-Job — Automated Postman/Newman API Test Runner
// =============================================================================
// Uses Newman's programmatic API (not CLI shell-out) for:
//   • Proper exit code propagation (CI goes RED on failures)
//   • Retry-with-backoff health check before test execution
//   • Structured pass/fail/skip summary output
//   • Dark-theme interactive HTML + JSON benchmark reports
// =============================================================================

import newman from 'newman';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// == Configuration ============================================================
const SERVER_URL = 'http://localhost:5000/api/v1/public/status/health';
const COLLECTION_PATH = path.join(__dirname, 'workly-job.postman_collection.json');
const ENVIRONMENT_PATH = path.join(__dirname, 'workly-job.postman_environment.json');
const REPORTS_DIR = path.join(__dirname, 'reports');

const MAX_HEALTH_RETRIES = 15;
const HEALTH_RETRY_INTERVAL_MS = 2000; // 2s between retries → 30s max wait

// == Ensure reports directory exists =========================================
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// == Health Check with Retry & Backoff =======================================
function checkServerHealth() {
  return new Promise((resolve) => {
    const req = http.get(SERVER_URL, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer() {
  console.log(`⏳ Polling server health at ${SERVER_URL}`);
  console.log(`   Max retries: ${MAX_HEALTH_RETRIES} × ${HEALTH_RETRY_INTERVAL_MS}ms\n`);

  for (let attempt = 1; attempt <= MAX_HEALTH_RETRIES; attempt++) {
    const isAlive = await checkServerHealth();
    if (isAlive) {
      console.log(`✅ Server is healthy (attempt ${attempt}/${MAX_HEALTH_RETRIES})\n`);
      return true;
    }
    if (attempt < MAX_HEALTH_RETRIES) {
      process.stdout.write(`   Attempt ${attempt}/${MAX_HEALTH_RETRIES} — not ready, retrying...\r`);
      await new Promise((r) => setTimeout(r, HEALTH_RETRY_INTERVAL_MS));
    }
  }
  return false;
}

// == Run Newman Programmatically =============================================
async function runAutomatedTests() {
  console.log('\n==========================================================');
  console.log('  🚀 Workly-Job — Automated API Test Runner');
  console.log('==========================================================\n');

  // 1. Wait for server
  const serverReady = await waitForServer();
  if (!serverReady) {
    console.error('❌ ERROR: Server did not become healthy within the timeout.');
    console.error('👉 Start your server first: pnpm dev\n');
    process.exit(1);
  }

  // 2. Prepare report paths
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const htmlReportPath = path.join(REPORTS_DIR, `workly-report-${timestamp}.html`);
  const jsonReportPath = path.join(REPORTS_DIR, `summary-${timestamp}.json`);

  console.log('📦 Collection :', path.basename(COLLECTION_PATH));
  console.log('🌐 Environment:', path.basename(ENVIRONMENT_PATH));
  console.log('📁 HTML Report :', htmlReportPath);
  console.log('📁 JSON Summary:', jsonReportPath);
  console.log('\n⏳ Executing Newman test suite...\n');

  // 3. Run Newman via programmatic API (not shell-out)
  return new Promise((resolve) => {
    newman.run(
      {
        collection: COLLECTION_PATH,
        environment: ENVIRONMENT_PATH,
        reporters: ['cli', 'htmlextra', 'json'],
        reporter: {
          htmlextra: {
            export: htmlReportPath,
            darkTheme: true,
            title: 'Workly-Job API Automated Test & Performance Report',
            showOnlyFails: false,
            noSyntaxHighlighting: false,
            showEnvironmentData: true,
            skipSensitiveData: true,
            showMarkdownLinks: true,
            browserTitle: 'Workly-Job API Report',
          },
          json: {
            export: jsonReportPath,
          },
        },
      },
      (err, summary) => {
        console.log('\n==========================================================');

        if (err) {
          console.error('💥 Newman encountered a fatal error:', err.message);
          console.log('==========================================================\n');
          process.exit(1);
        }

        // 4. Extract structured metrics
        const { stats, timings, failures } = summary.run;
        const totalAssertions = stats.assertions?.total ?? 0;
        const passedAssertions = totalAssertions - (stats.assertions?.failed ?? 0);
        const failedAssertions = stats.assertions?.failed ?? 0;
        const totalRequests = stats.requests?.total ?? 0;
        const failedRequests = stats.requests?.failed ?? 0;
        const avgResponseTime = Math.round(timings?.responseAverage ?? 0);
        const totalDuration = Math.round((timings?.completed ?? 0) / 1000);

        // 5. Print structured summary
        const status = failedAssertions === 0 && failedRequests === 0 ? '🎉 ALL PASSED' : '⚠️  FAILURES DETECTED';
        console.log(`  ${status}`);
        console.log('==========================================================');
        console.log('');
        console.log('  +==============================================+');
        console.log(`  │  Requests      : ${totalRequests} total, ${failedRequests} failed`);
        console.log(`  │  Assertions    : ${totalAssertions} total, ${passedAssertions} passed, ${failedAssertions} failed`);
        console.log(`  │  Avg Response  : ${avgResponseTime} ms`);
        console.log(`  │  Total Duration: ${totalDuration}s`);
        console.log('  +==============================================+');
        console.log('');
        console.log('  📁 Reports generated:');
        console.log(`     • HTML : ${htmlReportPath}`);
        console.log(`     • JSON : ${jsonReportPath}`);

        // 6. List failures if any
        if (failures.length > 0) {
          console.log(`\n  ❌ ${failures.length} Failure(s):\n`);
          failures.forEach((failure, index) => {
            const source = failure.source?.name ?? failure.parent?.name ?? 'Unknown';
            const errorMsg = failure.error?.message ?? 'No message';
            console.log(`     ${index + 1}. [${source}]`);
            console.log(`        → ${errorMsg}\n`);
          });
        }

        console.log('');

        // 7. Exit with proper code — CI will go RED on failures
        const exitCode = failedAssertions > 0 || failedRequests > 0 ? 1 : 0;
        resolve(exitCode);
      },
    );
  }).then((exitCode) => {
    process.exit(exitCode);
  });
}

runAutomatedTests();
