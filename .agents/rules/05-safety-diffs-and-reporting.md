# Rule 05: Safety, Secret Protection, Diffs & Structured Reporting

## 1. Secrets & Sensitive Data Protection
- Never log, commit, or display sensitive environment variables, secrets, or credentials.
- Ensure `.env` is listed in `.gitignore` and never staged.
- Check that test scripts generate throwaway credentials with dynamic timestamps and clean up after themselves.

## 2. Git Operations & Zero Auto-Push Policy
- **Strictly No Auto-Push:** Never run `git push`, auto-commit, or synchronize remotes automatically.
- Workspace settings enforce `"git.autoPush": "off"` and `"git.confirmSync": true`.
- Never execute destructive Git commands (`git reset --hard`, `git clean -fd`, `git push --force`).

## 3. Mandatory Diff Review
Before concluding any task, perform a thorough inspection:
1. Run `git diff` on all modified files.
2. Verify that only requested changes are included.
3. Verify that no unintended formatting churn or deleted comments occurred.
4. Verify that no accidental temporary files, logs, or scratch scripts remain untracked.

## 4. Mandatory Approval Gates
You must request explicit user approval before:
- Dropping, purging, or permanently modifying database collections.
- Introducing new third-party services or changing major framework architectures.
- Installing unfamiliar external libraries or npm packages.
- Performing repository-wide automated reformatting.

## 5. Standard Completion Report
Every task response must include a transparent summary:
1. **Files Modified, Created, or Removed:** Listed as clickable `file:///` links.
2. **Commands Executed & Exit Codes:** Table showing each verification command and result.
3. **Discrepancy Categorization:** Clear separation between pre-existing warnings and newly introduced issues.
4. **Remaining Risks / Next Actions:** Any remaining edge cases or suggested follow-ups.
