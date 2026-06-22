const EventBus = require("../events/event_bus");
const NodeManager = require("./node_manager");

class TaskRecoveryEngine {
    constructor() {
        this.failedTasks = new Map();
        this.recoveredTasks = new Map();
    }

    recordFailure(task, reason) {
        if (!task || !task.id) {
            throw new Error("[TASK_RECOVERY] Invalid task");
        }

        this.failedTasks.set(task.id, {
            task,
            reason,
            failedAt: Date.now()
        });

        EventBus.emit("task_recovery:recorded", {
            taskId: task.id,
            reason
        });

        return true;
    }

    recover(taskId) {
        const record = this.failedTasks.get(taskId);

        if (!record) {
            throw new Error("[TASK_RECOVERY] Task not found");
        }

        const recoveryTask = {
            ...record.task,
            retry: (record.task.retry || 0) + 1,
            recoveredAt: Date.now()
        };

        this.recoveredTasks.set(taskId, recoveryTask);
        this.failedTasks.delete(taskId);

        EventBus.emit("task_recovery:recovered", {
            taskId,
            retry: recoveryTask.retry
        });

        return recoveryTask;
    }

    retryFailed(limit = 10) {
        const tasks = Array.from(this.failedTasks.keys()).slice(0, limit);

        return tasks.map(id => this.recover(id));
    }

    snapshot() {
        return {
            failed: this.failedTasks.size,
            recovered: this.recoveredTasks.size
        };
    }
}

module.exports = new TaskRecoveryEngine();