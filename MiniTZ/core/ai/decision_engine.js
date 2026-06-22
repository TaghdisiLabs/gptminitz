const EventBus = require("../events/event_bus");

class DecisionEngine {
    constructor() {}

    evaluate(intent) {
        if (!intent) {
            throw new Error("[DECISION_ENGINE] Missing intent");
        }

        const decision = {
            intentType: intent.type,
            actions: this.mapActions(intent),
            priority: this.calculatePriority(intent),
            timestamp: Date.now()
        };

        EventBus.emit("decision:created", decision);

        return decision;
    }

    mapActions(intent) {
        switch (intent.type) {
            case "BUILD":
                return ["PLAN_BUILD", "ALLOCATE_RESOURCES", "EXECUTE_PIPELINE"];

            case "DEBUG":
                return ["ANALYZE_STATE", "FIND_ERROR", "RETRY_EXECUTION"];

            case "EXPLAIN":
                return ["GENERATE_EXPLANATION"];

            case "EXECUTE":
                return ["RUN_TASK"];

            default:
                return ["ROUTE_GENERAL"];
        }
    }

    calculatePriority(intent) {
        const base = intent.confidence || 0.5;

        if (intent.type === "DEBUG") return base + 0.3;
        if (intent.type === "BUILD") return base + 0.2;

        return base;
    }
}

module.exports = DecisionEngine;