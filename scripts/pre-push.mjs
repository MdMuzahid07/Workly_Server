import { styleText } from 'node:util';
import { execSync } from 'child_process';

console.log(styleText(['magenta', 'bold'], '\n⚙️  WORKLY SERVER • PRE-PUSH CHECKS'));
console.log(styleText('dim', '────────────────────────────────────────────────────────'));

const startTime = Date.now();

try {
  console.log(`\n📦 ${styleText('bold', 'TypeScript Compiler Type-Checking')}`);
  console.log(styleText('dim', '   Running tsc --noEmit...'));
  console.log();

  execSync('pnpm type-check', { stdio: 'inherit' });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    styleText(
      'green',
      `\n✅ ${styleText('bold', 'TypeScript type-check passed successfully!')} ${styleText('dim', `(${elapsed}s)`)}`,
    ),
  );
  console.log(styleText(['green', 'bold'], '🎉 All types are solid! Ready to push.\n'));
} catch {
  console.error(styleText('red', `\n❌ ${styleText('bold', 'Pre-push type-checking failed!')}`));
  console.error(
    styleText('dim', '   Please fix the TypeScript compilation errors listed above.\n'),
  );
  process.exit(1);
}
