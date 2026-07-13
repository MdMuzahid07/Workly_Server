import { styleText } from 'node:util';
import { execSync } from 'child_process';

console.log(styleText(['cyan', 'bold'], '\n🚀 WORKLY SERVER • PRE-COMMIT CHECKS'));
console.log(styleText('dim', '────────────────────────────────────────────────────────'));

const startTime = Date.now();

try {
  console.log(`\n🔍 ${styleText('bold', 'Staged Files Linting & Formatting')}`);
  console.log(styleText('dim', '   Running lint-staged (eslint + prettier)...'));
  console.log();

  process.env.FAST_LINT = 'true';
  execSync('pnpm exec lint-staged', { stdio: 'inherit' });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    styleText(
      'green',
      `\n✅ ${styleText('bold', 'Staged checks passed successfully!')} ${styleText('dim', `(${elapsed}s)`)}`,
    ),
  );
  console.log(styleText(['green', 'bold'], '🎉 Clean code! Ready to commit.\n'));
} catch {
  console.error(styleText('red', `\n❌ ${styleText('bold', 'Pre-commit check failed!')}`));
  console.error(
    styleText('dim', '   Please resolve the ESLint or Prettier issues highlighted above.\n'),
  );
  process.exit(1);
}
