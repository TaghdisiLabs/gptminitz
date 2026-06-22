const EventBus = require("../events/event_bus");

class AIContractValidator {
    constructor() {}

    validate(input, output) {
        if (!input) {
            throw new Error("[AI_CONTRACT_VALIDATOR] Missing input");
        }

        const result = {
            valid: this.checkValidity(output),
            score: this.scoreOutput(output),
            issues: this.findIssues(output),
            timestamp: Date.now()
        };

        EventBus.emit("ai_contract:validated", result);

        if (!result.valid) {
            EventBus.emit("ai_contract:rejected", {
                timestamp: Date.now()
            });
        }

        return result;
    }

    checkValidity(output) {
        if (output === null || output === undefined) return false;

        if (typeof output === "string") {
            return output.trim().length > 0;
        }

        if (typeof output === "object") {
            return Object.keys(output).length > 0;
        }

        return true;
    }

    scoreOutput(output) {
        if (!output) return 0;

        let score = 0.5;

        if (typeof output === "object") score += 0.3;
        if (typeof output === "string" && output.length > 50) score += 0.2;

        return Math.min(1, score);
    }

    findIssues(output) {
        const issues = [];

        if (!output) {
            issues.push("EMPTY_OUTPUT");
            return issues;
        }

        if (typeof output === "string" && output.length < 5) {
            issues.push("OUTPUT_TOO_SHORT");
        }

        return issues;
    }
}

module.exports = new AIContractValidator();