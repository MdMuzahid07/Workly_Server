import chalk from 'chalk';
import { execSync } from 'child_process';

console.log(chalk.bold.cyan('\n🚀 WORKLY SERVER • PRE-COMMIT CHECKS'));
console.log(chalk.dim('────────────────────────────────────────────────────────'));

const startTime = Date.now();

try {
  console.log(`\n🔍 ${chalk.bold('Staged Files Linting & Formatting')}`);
  console.log(chalk.dim('   Running lint-staged (eslint + prettier)...'));
  console.log();

  process.env.FAST_LINT = 'true';
  execSync('pnpm exec lint-staged', { stdio: 'inherit' });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    chalk.green(
      `\n✅ ${chalk.bold('Staged checks passed successfully!')} ${chalk.dim(`(${elapsed}s)`)}`,
    ),
  );
  console.log(chalk.bold.green('🎉 Clean code! Ready to commit.\n'));
} catch {
  console.error(chalk.red(`\n❌ ${chalk.bold('Pre-commit check failed!')}`));
  console.error(chalk.dim('   Please resolve the ESLint or Prettier issues highlighted above.\n'));
  process.exit(1);
}
