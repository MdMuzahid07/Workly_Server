# Contributing to Workly Server

This project uses git hooks to enforce coding style, formatting, and correctness before changes reach the repository.

## Development Quality Workflow

### Pre-commit Hook (Formatting & Linting)

When you run `git commit`, `lint-staged` will automatically run:

1. **ESLint (`eslint --fix --max-warnings=0`)** on all staged `.ts` and `.js` files inside `src/`.
   - _Performance Optimization:_ Pre-commit runs in a fast non-type-aware mode by setting `FAST_LINT=true` to prevent loading `tsconfig.json` for every single file.
2. **Prettier (`prettier --write`)** on all staged files (including `.json`, `.md`, `.yaml`, and `.yml` files).

Your commit will be blocked if there are unfixable lint errors or warnings.

### Pre-push Hook (Type Checking)

When you run `git push`, a pre-push hook runs the full compiler type-check:

```bash
yarn type-check
```

Your push will be blocked if there are any TypeScript compilation errors.

---

## Emergency Bypass

If you have a genuine emergency and need to bypass the checks, use the `--no-verify` flag:

- Bypass commit hooks: `git commit -m "..." --no-verify`
- Bypass push hooks: `git push origin branch --no-verify`

_Note: Use this sparingly. Continuous Integration (CI) will still reject files with lint or type errors._

---

## Continuous Integration (CI) Check

CI runs the same quality validation on every pull request, enforcing type-aware linting:

```bash
# Verify type-safety
yarn type-check

# Verify type-aware linting
yarn lint
```
