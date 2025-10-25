# Pipeline Errors Prevention Guide

**Last Updated:** October 25, 2025

## The Problem

Pipeline builds keep failing with errors like:
- "Could not load module"
- "ENOENT: no such file or directory"  
- "Module not found"
- Build failures despite code working locally

## Root Causes

1. **Monorepo workspace symlink issues** - Dependencies in root node_modules/, workspaces use symlinks
2. **Folder renames not tested** - Renaming folders breaks pipeline paths
3. **Multiple concurrent sessions** - Changes from different Claude Code sessions get mixed
4. **Pipeline changes pushed directly to main** - No testing before production

## Prevention Rules

### Rule #1: ALWAYS Test Pipeline Changes on Feature Branch

**❌ NEVER DO THIS:**
```bash
# Make pipeline changes
git add .azure-pipelines/admin-portal.yml
git commit -m "Update pipeline"
git push origin main  # 🔥 Breaks production!
```

**✅ ALWAYS DO THIS:**
```bash
# Create feature branch
git checkout -b pipeline/test-admin-portal-changes
git add .azure-pipelines/admin-portal.yml
git commit -m "Test: Update admin portal pipeline"
git push origin pipeline/test-admin-portal-changes

# Wait for pipeline to run on feature branch
# Check: https://dev.azure.com/ctn-demo/ASR/_build
# Only merge to main after successful build
```

### Rule #2: Folder Renames Require Complete Update

**When renaming a workspace folder (e.g., web/ → admin-portal/):**

1. **Update root package.json workspaces array**
2. **Update ALL pipeline yml files that reference the folder**
3. **Update any scripts that cd into the folder**
4. **Test on feature branch FIRST**
5. **Verify symlinks in pipeline:**
   ```yaml
   - script: |
       npm ci --legacy-peer-deps
       # Verify workspace symlinks
       ls -la admin-portal/node_modules/react
   ```

### Rule #3: One Claude Code Session at a Time

**❌ NEVER:**
- Run multiple Claude Code sessions in same repo simultaneously
- Have one session working on admin portal while another works on member portal

**✅ ALWAYS:**
- Work sequentially - finish one task, commit, then start next
- Or use separate feature branches for concurrent work

### Rule #4: Verify Monorepo Dependencies

**After any structural changes, verify:**

```bash
# 1. Root dependencies installed
npm ci --legacy-peer-deps

# 2. Workspace symlinks exist
ls -la admin-portal/node_modules/
ls -la member-portal/node_modules/

# 3. Can build locally
npm run build -w admin-portal
npm run build -w member-portal
```

## Emergency Recovery

**If pipeline is broken on main:**

1. **Don't panic - don't make it worse**
2. **Check what changed:**
   ```bash
   git log -5 --oneline
   git diff HEAD~1 HEAD
   ```

3. **Quick fix options:**
   - **Revert last commit:** `git revert HEAD && git push`
   - **Fix forward:** Create feature branch, fix, test, merge

4. **Never force-push to main** - breaks history for everyone

## Pipeline Build Checklist

Before pushing pipeline changes:

- [ ] Changes tested on feature branch first
- [ ] Feature branch pipeline succeeded
- [ ] Root package.json workspaces array is correct
- [ ] All pipeline yml files updated
- [ ] Local build works: `npm run build -w <workspace>`
- [ ] PR reviewed before merge to main

## Common Errors and Fixes

### Error: "Could not load /path/to/admin-portal/node_modules/react"

**Cause:** Workspace symlinks not created after folder rename

**Fix:**
```yaml
- script: |
    npm ci --legacy-peer-deps
    # Verify symlinks after install
    ls -la admin-portal/node_modules/
```

### Error: "Cannot find module '@ctn/api-client'"

**Cause:** Workspace not listed in root package.json

**Fix:** Add to workspaces array in root package.json

### Error: "npm ERR! workspace web@0.1.0"

**Cause:** Workspace name in package.json doesn't match folder structure

**Fix:** Update workspace name or folder name to match

## See Also

- `CLAUDE.md` - Lesson #21: Never test pipeline changes on main
- `CLAUDE.md` - Lesson #29: Folder renames break pipeline builds
- `docs/PIPELINE_PREVENTION_CHECKLIST.md` - Full checklist
