const EventBus = require("./event_bus");

class DeterminismGuard {
    constructor() {
        this.eventLog = [];
        this.enabled = true;
    }

    enable() {
        this.enabled = true;

        EventBus.emit("determinism:enabled", {
            timestamp: Date.now()
        });
    }

    disable() {
        this.enabled = false;

        EventBus.emit("determinism:disabled", {
            timestamp: Date.now()
        });
    }

    record(event, payload) {
        if (!this.enabled) return;

        const entry = {
            event,
            payload: this.deepFreeze(payload),
            timestamp: Date.now()
        };

        this.eventLog.push(entry);

        return entry;
    }

    verifyConsistency(eventA, eventB) {
        if (!eventA || !eventB) {
            return false;
        }

        return JSON.stringify(eventA.payload) === JSON.stringify(eventB.payload);
    }

    replay() {
        const replayed = [];

        for (const entry of this.eventLog) {
            replayed.push({
                event: entry.event,
                payload: JSON.parse(JSON.stringify(entry.payload))
            });
        }

        return replayed;
    }

    deepFreeze(obj) {
        if (obj && typeof obj === "object") {
            return JSON.parse(JSON.stringify(obj));
        }
        return obj;
    }

    snapshot() {
        return {
            enabled: this.enabled,
            eventCount: this.eventLog.length
        };
    }
}

module.exports = new DeterminismGuard();