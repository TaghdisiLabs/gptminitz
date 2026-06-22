const EventBus = require("../events/event_bus");

class ReasoningTraceEngine {
    constructor() {
        this.traces = new Map();
    }

    start(traceId, input) {
        if (!traceId) {
            throw new Error("[TRACE_ENGINE] Missing traceId");
        }

        const trace = {
            traceId,
            input,
            steps: [],
            startedAt: Date.now()
        };

        this.traces.set(traceId, trace);

        EventBus.emit("trace:start", {
            traceId,
            timestamp: Date.now()
        });

        return trace;
    }

    addStep(traceId, step) {
        const trace = this.traces.get(traceId);

        if (!trace) {
            throw new Error("[TRACE_ENGINE] Trace not found");
        }

        const record = {
            step: step.step || trace.steps.length + 1,
            action: step.action,
            data: step.data || null,
            timestamp: Date.now()
        };

        trace.steps.push(record);

        EventBus.emit("trace:step", {
            traceId,
            step: record
        });

        return record;
    }

    finish(traceId, output) {
        const trace = this.traces.get(traceId);

        if (!trace) {
            throw new Error("[TRACE_ENGINE] Trace not found");
        }

        trace.finishedAt = Date.now();
        trace.output = output;

        EventBus.emit("trace:finish", {
            traceId,
            duration: trace.finishedAt - trace.startedAt
        });

        return trace;
    }

    get(traceId) {
        return this.traces.get(traceId) || null;
    }

    snapshot() {
        return Object.fromEntries(this.traces);
    }
}

module.exports = ReasoningTraceEngine;