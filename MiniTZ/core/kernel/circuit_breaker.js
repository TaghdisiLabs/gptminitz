const EventBus = require("../events/event_bus");

class CircuitBreaker {
    constructor(threshold = 5, resetTimeout = 10000) {
        this.threshold = threshold;
        this.resetTimeout = resetTimeout;

        this.failures = new Map();
        this.openCircuits = new Map();
    }

    recordFailure(key) {
        const count = (this.failures.get(key) || 0) + 1;
        this.failures.set(key, count);

        if (count >= this.threshold) {
            this.openCircuit(key);
        }

        EventBus.emit("circuit:failure", { key, count });
    }

    openCircuit(key) {
        this.openCircuits.set(key, Date.now());

        EventBus.emit("circuit:open", {
            key,
            timestamp: Date.now()
        });

        setTimeout(() => {
            this.closeCircuit(key);
        }, this.resetTimeout);
    }

    closeCircuit(key) {
        this.failures.delete(key);
        this.openCircuits.delete(key);

        EventBus.emit("circuit:close", {
            key,
            timestamp: Date.now()
        });
    }

    canExecute(key) {
        return !this.openCircuits.has(key);
    }

    status() {
        return {
            failures: Object.fromEntries(this.failures),
            open: Object.fromEntries(this.openCircuits)
        };
    }
}

module.exports = new CircuitBreaker();