const EventBus = require("../events/event_bus");

class ExecutionContractValidator {
    constructor() {}

    validate(task) {
        if (!task) {
            throw new Error("[EXEC_CONTRACT] Missing task");
        }

        const report = {
            valid: true,
            errors: [],
            warnings: [],
            timestamp: Date.now()
        };

        // Required fields
        if (!task.id) {
            report.valid = false;
            report.errors.push("MISSING_TASK_ID");
        }

        if (!task.type && !task.pipeline) {
            report.valid = false;
            report.errors.push("MISSING_EXECUTION_TYPE_OR_PIPELINE");
        }

        // Safety checks
        if (task.input === undefined) {
            report.warnings.push("MISSING_INPUT");
        }

        // Type validation
        if (task.type && typeof task.type !== "string") {
            report.valid = false;
            report.errors.push("INVALID_TASK_TYPE");
        }

        // Pipeline validation
        if (task.pipeline && typeof task.pipeline !== "string") {
            report.valid = false;
            report.errors.push("INVALID_PIPELINE_REFERENCE");
        }

        EventBus.emit("execution_contract:validated", report);

        if (!report.valid) {
            EventBus.emit("execution_contract:rejected", {
                taskId: task.id || null,
                errors: report.errors
            });
        }

        return report;
    }

    strictValidate(task) {
        const result = this.validate(task);

        if (!result.valid) {
            throw new Error(
                "[EXEC_CONTRACT] Strict validation failed: " +
                result.errors.join(", ")
            );
        }

        return true;
    }
}

module.exports = new ExecutionContractValidator();