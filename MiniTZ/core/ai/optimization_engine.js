const EventBus = require("../events/event_bus");

class OptimizationEngine {
    constructor() {}

    rank(decision) {
        if (!decision) {
            throw new Error("[OPTIMIZATION_ENGINE] Missing decision");
        }

        const optimized = {
            intentType: decision.intentType,
            actions: this.prioritize(decision.actions),
            priority: decision.priority,
            costEstimate: this.estimateCost(decision.actions),
            timestamp: Date.now()
        };

        EventBus.emit("optimization:completed", optimized);

        return optimized;
    }

    prioritize(actions) {
        if (!Array.isArray(actions)) return [];

        const weightMap = {
            EXECUTE_PIPELINE: 10,
            RUN_TASK: 9,
            PLAN_BUILD: 8,
            GENERATE_EXPLANATION: 5,
            ROUTE_GENERAL: 3,
            ANALYZE_STATE: 6,
            FIND_ERROR: 7,
            RETRY_EXECUTION: 6
        };

        return actions
            .map(action => ({
                action,
                weight: weightMap[action] || 1
            }))
            .sort((a, b) => b.weight - a.weight)
            .map(a => a.action);
    }

    estimateCost(actions) {
        if (!actions) return 0;

        const costMap = {
            EXECUTE_PIPELINE: 5,
            RUN_TASK: 4,
            PLAN_BUILD: 6,
            GENERATE_EXPLANATION: 2,
            ROUTE_GENERAL: 1,
            ANALYZE_STATE: 3,
            FIND_ERROR: 3,
            RETRY_EXECUTION: 4
        };

        return actions.reduce((sum, action) => {
            return sum + (costMap[action] || 1);
        }, 0);
    }
}

module.exports = OptimizationEngine;