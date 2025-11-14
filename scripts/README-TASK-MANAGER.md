# Task Manager Automation

## Overview

The Task Manager system automatically keeps `TASK_MANAGER.md` up to date using git hooks and helper scripts.

## Automatic Updates (Post-Commit Hook)

**Location:** `.git/hooks/post-commit`

**What it does:**
- Runs automatically after every `git commit`
- Updates the "Last Updated" timestamp in TASK_MANAGER.md
- Amends the commit to include the updated timestamp
- Prevents infinite loops by checking for self-updates

**Example:**
```bash
git commit -m "feat: add new feature"
# Hook runs automatically
# TASK_MANAGER.md timestamp is updated
# Commit is amended with updated file
```

## Manual Task Management

**Script:** `scripts/update-task-manager.sh`

### Mark a Task Complete

```bash
# Mark a specific task as complete
./scripts/update-task-manager.sh SEC-ROTATE-001

# Output:
# ✅ Marked SEC-ROTATE-001 as complete
# ✅ Updated timestamp to November 14, 2025
```

### List Pending Tasks

```bash
# Show pending high priority tasks
./scripts/update-task-manager.sh list

# Output:
# 📋 Pending High Priority Tasks:
# - [ ] **SEC-ROTATE-001: Rotate PostgreSQL password** - CRITICAL
# - [ ] **SEC-ROTATE-002: Rotate Storage Account keys** - CRITICAL
# ...
```

### Update Timestamp Only

```bash
# Just update the timestamp
./scripts/update-task-manager.sh timestamp

# Output:
# ✅ Updated timestamp to November 14, 2025
```

## Workflow Example

### Scenario 1: Completing a Task with Commit

```bash
# 1. Complete your work
# 2. Commit with task reference in message
git commit -m "feat(security): rotate PostgreSQL password

Completed SEC-ROTATE-001:
- Generated new password in Azure Portal
- Updated Key Vault secret
- Updated local.settings.json
- Tested database connection"

# 3. Mark task as complete
./scripts/update-task-manager.sh SEC-ROTATE-001

# 4. Commit the task update
git add TASK_MANAGER.md
git commit -m "chore: mark SEC-ROTATE-001 as complete"
# Post-commit hook updates timestamp automatically
```

### Scenario 2: Multiple Tasks

```bash
# Complete multiple tasks
./scripts/update-task-manager.sh SEC-ROTATE-001
./scripts/update-task-manager.sh SEC-ROTATE-002
./scripts/update-task-manager.sh SEC-ROTATE-003

# Commit all updates at once
git add TASK_MANAGER.md
git commit -m "chore: mark security rotation tasks complete"
```

## File Structure

```
/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/
├── TASK_MANAGER.md                    # Main task tracking file
├── .git/hooks/post-commit             # Auto-update hook
├── scripts/
│   ├── update-task-manager.sh         # Manual update script
│   └── README-TASK-MANAGER.md         # This file
```

## Hook Installation

The post-commit hook is already installed in `.git/hooks/`. If you need to reinstall it:

```bash
# Copy the hook
cp scripts/post-commit.template .git/hooks/post-commit

# Make it executable
chmod +x .git/hooks/post-commit
```

## Troubleshooting

### Hook Not Running

```bash
# Check if hook exists and is executable
ls -la .git/hooks/post-commit

# If not executable:
chmod +x .git/hooks/post-commit
```

### Timestamp Not Updating

```bash
# Manually update timestamp
./scripts/update-task-manager.sh timestamp
```

### Task Not Found

```bash
# Check the exact task ID format in TASK_MANAGER.md
grep "SEC-ROTATE" TASK_MANAGER.md

# Use the exact ID format shown
./scripts/update-task-manager.sh SEC-ROTATE-001
```

## Best Practices

1. **Reference Tasks in Commits:** Include task IDs in commit messages for traceability
2. **Update After Completion:** Mark tasks complete immediately after finishing work
3. **Batch Updates:** Update multiple tasks together if completing related work
4. **Verify Changes:** Always check `git status` after using the update script

## Integration with Claude Code

When working with Claude Code, you can ask:
- "Mark SEC-ROTATE-001 as complete" → Claude runs the update script
- "Show pending tasks" → Claude runs the list command
- "Update TASK_MANAGER timestamp" → Claude runs the timestamp command

The automation ensures TASK_MANAGER.md stays current without manual editing.
