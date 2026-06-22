const IntentEngine = require("./intent_engine");
const DecisionEngine = require("./decision_engine");
const OptimizationEngine = require("./optimization_engine");

const ExecutionPlanGenerator = require("./execution_plan_generator");
const EventBus = require("../events/event_bus");

class Orchestrator {
    constructor() {
        this.intent = new IntentEngine();
        this.decision = new DecisionEngine();
        this.optimizer = new OptimizationEngine();
        this.planGenerator = new ExecutionPlanGenerator();
    }

    async fetchTasks() {
        // In real system this comes from API / queue
        return [];
    }

    async process(input) {
        if (!input) return;

        EventBus.emit("orchestrator:input_received", {
            timestamp: Date.now()
        });

        // 1. Understand intent
        const intent = this.intent.analyze(input);

        // 2. Make decision
        const decision = this.decision.evaluate(intent);

        // 3. Optimize decision
        const optimized = this.optimizer.rank(decision);

        // 4. Build execution plan
        const plan = this.planGenerator.build(optimized);

        EventBus.emit("orchestrator:plan_ready", {
            taskId: input.id || null,
            timestamp: Date.now()
        });

        return plan;
    }
}

module.exports = Orchestrator;