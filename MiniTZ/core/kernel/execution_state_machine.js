const EventBus = require("../events/event_bus");

const STATES = Object.freeze({
    IDLE: "IDLE",
    QUEUED: "QUEUED",
    RUNNING: "RUNNING",
    SUCCESS: "SUCCESS",
    FAILED: "FAILED",
    CANCELLED: "CANCELLED"
});

class ExecutionStateMachine {
    constructor() {
        this.states = new Map();
    }

    init(taskId) {
        if (!taskId) throw new Error("[STATE_MACHINE] Missing taskId");

        this.states.set(taskId, STATES.IDLE);

        EventBus.emit("state:init", {
            taskId,
            state: STATES.IDLE,
            timestamp: Date.now()
        });
    }

    transition(taskId, nextState) {
        if (!this.states.has(taskId)) {
            throw new Error("[STATE_MACHINE] Task not initialized");
        }

        const current = this.states.get(taskId);

        if (!this.isValidTransition(current, nextState)) {
            throw new Error(
                `[STATE_MACHINE] Invalid transition ${current} → ${nextState}`
            );
        }

        this.states.set(taskId, nextState);

        EventBus.emit("state:transition", {
            taskId,
            from: current,
            to: nextState,
            timestamp: Date.now()
        });
    }

    get(taskId) {
        return this.states.get(taskId) || null;
    }

    isValidTransition(from, to) {
        const valid = {
            IDLE: ["QUEUED", "CANCELLED"],
            QUEUED: ["RUNNING", "CANCELLED"],
            RUNNING: ["SUCCESS", "FAILED", "CANCELLED"],
            SUCCESS: [],
            FAILED: [],
            CANCELLED: []
        };

        return valid[from]?.includes(to);
    }

    snapshot() {
        return Object.fromEntries(this.states);
    }
}

module.exports = new ExecutionStateMachine();