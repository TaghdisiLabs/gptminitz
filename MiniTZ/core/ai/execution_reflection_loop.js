const EventBus = require("../events/event_bus");

class ExecutionReflectionLoop {
    constructor() {
        this.records = new Map();
    }

    start(taskId, context) {
        if (!taskId) {
            throw new Error("[REFLECTION_LOOP] Missing taskId");
        }

        const record = {
            taskId,
            context,
            iterations: [],
            status: "ACTIVE",
            createdAt: Date.now()
        };

        this.records.set(taskId, record);

        EventBus.emit("reflection:start", {
            taskId,
            timestamp: Date.now()
        });

        return record;
    }

    addIteration(taskId, data) {
        const record = this.records.get(taskId);

        if (!record) {
            throw new Error("[REFLECTION_LOOP] Task not found");
        }

        const iteration = {
            step: record.iterations.length + 1,
            input: data.input || null,
            output: data.output || null,
            error: data.error || null,
            timestamp: Date.now()
        };

        record.iterations.push(iteration);

        EventBus.emit("reflection:iteration", {
            taskId,
            iteration
        });

        return iteration;
    }

    evaluate(taskId) {
        const record = this.records.get(taskId);

        if (!record) {
            throw new Error("[REFLECTION_LOOP] Task not found");
        }

        const hasErrors = record.iterations.some(i => i.error);
        const success = !hasErrors;

        record.status = success ? "STABLE" : "UNSTABLE";

        EventBus.emit("reflection:evaluate", {
            taskId,
            status: record.status
        });

        return {
            taskId,
            status: record.status,
            iterations: record.iterations.length
        };
    }

    get(taskId) {
        return this.records.get(taskId) || null;
    }

    snapshot() {
        return Object.fromEntries(this.records);
    }
}

module.exports = new ExecutionReflectionLoop();