const EventBus = require("../events/event_bus");

class ExecutionPlanGenerator {
    constructor() {}

    build(optimizedDecision) {
        if (!optimizedDecision) {
            throw new Error("[EXECUTION_PLAN_GENERATOR] Missing optimized decision");
        }

        const plan = {
            id: this.generateId(),
            intentType: optimizedDecision.intentType,
            steps: this.buildSteps(optimizedDecision.actions),
            priority: optimizedDecision.priority,
            costEstimate: optimizedDecision.costEstimate,
            createdAt: Date.now(),
            status: "READY"
        };

        EventBus.emit("plan:generated", plan);

        return plan;
    }

    buildSteps(actions) {
        if (!Array.isArray(actions)) return [];

        return actions.map((action, index) => {
            return {
                step: index + 1,
                action,
                status: "PENDING",
                createdAt: Date.now()
            };
        });
    }

    generateId() {
        return `plan_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    }
}

module.exports = ExecutionPlanGenerator;