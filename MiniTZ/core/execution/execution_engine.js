const EventBus = require("../events/event_bus");

class ExecutionEngine {
    constructor() {
        this.activeTasks = new Map();
        this.completedTasks = new Map();
    }

    execute(task) {
        if (!task || !task.id) {
            throw new Error("[EXECUTION_ENGINE] Invalid task");
        }

        const runtimeTask = {
            id: task.id,
            status: "RUNNING",
            input: task.input || null,
            result: null,
            startedAt: Date.now()
        };

        this.activeTasks.set(task.id, runtimeTask);

        EventBus.emit("execution:started", {
            taskId: task.id
        });

        try {
            const result = this.run(task);

            runtimeTask.status = "COMPLETED";
            runtimeTask.result = result;
            runtimeTask.completedAt = Date.now();

            this.activeTasks.delete(task.id);
            this.completedTasks.set(task.id, runtimeTask);

            EventBus.emit("execution:completed", {
                taskId: task.id,
                result
            });

            return runtimeTask;
        } catch (err) {
            runtimeTask.status = "FAILED";
            runtimeTask.error = err.message;
            runtimeTask.failedAt = Date.now();

            this.activeTasks.delete(task.id);
            this.completedTasks.set(task.id, runtimeTask);

            EventBus.emit("execution:failed", {
                taskId: task.id,
                error: err.message
            });

            return runtimeTask;
        }
    }

    run(task) {
        if (!task || !task.type) {
            throw new Error("[EXECUTION_ENGINE] Missing task type");
        }

        // placeholder deterministic execution logic
        switch (task.type) {
            case "echo":
                return task.input;

            case "sum":
                if (!Array.isArray(task.input)) {
                    throw new Error("SUM expects array");
                }
                return task.input.reduce((a, b) => a + b, 0);

            default:
                return {
                    message: "TASK_EXECUTED",
                    input: task.input
                };
        }
    }

    getTask(id) {
        return this.activeTasks.get(id) || this.completedTasks.get(id) || null;
    }

    snapshot() {
        return {
            active: this.activeTasks.size,
            completed: this.completedTasks.size
        };
    }
}

module.exports = new ExecutionEngine();