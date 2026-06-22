const EventBus = require("../events/event_bus");
const ExecutionEngine = require("./execution_engine");

class PipelineExecutor {
    constructor() {
        this.pipelines = new Map();
    }

    register(pipelineName, steps) {
        if (!pipelineName || !Array.isArray(steps)) {
            throw new Error("[PIPELINE_EXECUTOR] Invalid pipeline");
        }

        this.pipelines.set(pipelineName, steps);

        EventBus.emit("pipeline:registered", {
            pipelineName,
            steps: steps.length
        });

        return true;
    }

    execute(pipelineName, input) {
        const steps = this.pipelines.get(pipelineName);

        if (!steps) {
            throw new Error(`[PIPELINE_EXECUTOR] Pipeline not found: ${pipelineName}`);
        }

        let context = { input };

        EventBus.emit("pipeline:started", {
            pipelineName
        });

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];

            try {
                const task = {
                    id: `${pipelineName}_step_${i}_${Date.now()}`,
                    type: step.type,
                    input: context.output || context.input
                };

                const result = ExecutionEngine.execute(task);

                context = {
                    ...context,
                    output: result.result
                };

                EventBus.emit("pipeline:step_completed", {
                    pipelineName,
                    step: i
                });

            } catch (err) {
                EventBus.emit("pipeline:failed", {
                    pipelineName,
                    step: i,
                    error: err.message
                });

                throw err;
            }
        }

        EventBus.emit("pipeline:completed", {
            pipelineName
        });

        return context.output;
    }

    list() {
        return Array.from(this.pipelines.keys());
    }

    snapshot() {
        return Object.fromEntries(
            Array.from(this.pipelines.entries()).map(([k, v]) => [k, v.length])
        );
    }
}

module.exports = new PipelineExecutor();