#!/bin/bash
#
# Manual Task Manager Update Script
# Use this script to manually update TASK_MANAGER.md with completed tasks
#
# Usage: ./scripts/update-task-manager.sh [task-id]
# Example: ./scripts/update-task-manager.sh SEC-ROTATE-001
#

TASK_FILE="TASK_MANAGER.md"
CURRENT_DATE=$(date +"%B %d, %Y")

# Function to update timestamp
update_timestamp() {
    sed -i.bak "s/\*\*Last Updated:\*\* .*/\*\*Last Updated:\*\* $CURRENT_DATE (Manual update)/" "$TASK_FILE"
    rm -f "$TASK_FILE.bak"
    echo "✅ Updated timestamp to $CURRENT_DATE"
}

# Function to mark a task as complete
mark_task_complete() {
    local task_id=$1

    if [ -z "$task_id" ]; then
        echo "❌ Error: No task ID provided"
        echo "Usage: $0 [task-id]"
        echo "Example: $0 SEC-ROTATE-001"
        return 1
    fi

    # Replace [ ] with [x] for the specific task
    if grep -q "\\[ \\] \*\*$task_id" "$TASK_FILE"; then
        sed -i.bak "s/\\[ \\] \*\*$task_id/[x] **$task_id/" "$TASK_FILE"
        rm -f "$TASK_FILE.bak"
        echo "✅ Marked $task_id as complete"
        update_timestamp
        return 0
    else
        echo "⚠️  Task $task_id not found or already complete"
        return 1
    fi
}

# Function to show pending tasks
show_pending_tasks() {
    echo "📋 Pending High Priority Tasks:"
    grep -A 1 "\\[ \\].*CRITICAL\|\\[ \\].*HIGH" "$TASK_FILE" | grep "\\*\\*SEC-\\|\\*\\*DB-\\|\\*\\*API-" | head -10
}

# Main script logic
if [ ! -f "$TASK_FILE" ]; then
    echo "❌ Error: $TASK_FILE not found"
    exit 1
fi

case "${1:-help}" in
    help|--help|-h)
        echo "Task Manager Update Script"
        echo ""
        echo "Usage:"
        echo "  $0 [task-id]          Mark a specific task as complete"
        echo "  $0 timestamp          Update only the timestamp"
        echo "  $0 list               List pending high priority tasks"
        echo "  $0 help               Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 SEC-ROTATE-001     Mark SEC-ROTATE-001 as complete"
        echo "  $0 timestamp          Just update the timestamp"
        echo "  $0 list               Show pending tasks"
        ;;

    timestamp)
        update_timestamp
        ;;

    list)
        show_pending_tasks
        ;;

    *)
        mark_task_complete "$1"
        ;;
esac

exit 0
