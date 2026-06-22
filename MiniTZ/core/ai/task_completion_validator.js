const EventBus = require("../events/event_bus");

class TaskCompletionValidator {
    constructor() {}

    validate(task, result) {
        if (!task) {
            throw new Error("[TASK_VALIDATOR] Missing task");
        }

        const validation = {
            taskId: task.id || null,
            isComplete: this.isComplete(task, result),
            score: this.scoreResult(task, result),
            errors: this.findErrors(task, result),
            timestamp: Date.now()
        };

        EventBus.emit("task:validated", validation);

        if (!validation.isComplete) {
            EventBus.emit("task:incomplete", {
                taskId: validation.taskId,
                timestamp: Date.now()
            });
        }

        return validation;
    }

    isComplete(task, result) {
        if (!result) return false;
        if (typeof result === "string" && result.length === 0) return false;

        if (task.requiredFields && Array.isArray(task.requiredFields)) {
            return task.requiredFields.every(field => {
                return result && result[field] !== undefined;
            });
        }

        return true;
    }

    scoreResult(task, result) {
        let score = 0.5;

        if (!result) return 0;

        if (typeof result === "object") score += 0.3;
        if (typeof result === "string" && result.length > 50) score += 0.2;

        return Math.min(1, score);
    }

    findErrors(task, result) {
        const errors = [];

        if (!result) {
            errors.push("Missing result");
            return errors;
        }

        if (task.requiredFields && Array.isArray(task.requiredFields)) {
            for (const field of task.requiredFields) {
                if (!result[field]) {
                    errors.push(`Missing field: ${field}`);
                }
            }
        }

        return errors;
    }
}

module.exports = new TaskCompletionValidator();