import chalk from 'chalk';
import { execSync } from 'child_process';

console.log(chalk.bold.magenta('\n⚙️  WORKLY SERVER • PRE-PUSH CHECKS'));
console.log(chalk.dim('────────────────────────────────────────────────────────'));

const startTime = Date.now();

try {
  console.log(`\n📦 ${chalk.bold('TypeScript Compiler Type-Checking')}`);
  console.log(chalk.dim('   Running tsc --noEmit...'));
  console.log();

  execSync('pnpm type-check', { stdio: 'inherit' });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    chalk.green(
      `\n✅ ${chalk.bold('TypeScript type-check passed successfully!')} ${chalk.dim(`(${elapsed}s)`)}`,
    ),
  );
  console.log(chalk.bold.green('🎉 All types are solid! Ready to push.\n'));
} catch {
  console.error(chalk.red(`\n❌ ${chalk.bold('Pre-push type-checking failed!')}`));
  console.error(chalk.dim('   Please fix the TypeScript compilation errors listed above.\n'));
  process.exit(1);
}
