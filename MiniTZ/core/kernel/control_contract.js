const EventBus = require("../events/event_bus");

class ControlContract {
    constructor() {
        this.rules = new Map();
    }

    define(contractName, ruleFn) {
        if (typeof ruleFn !== "function") {
            throw new Error("[CONTROL_CONTRACT] Rule must be a function");
        }

        this.rules.set(contractName, ruleFn);

        EventBus.emit("contract:defined", {
            contractName,
            timestamp: Date.now()
        });
    }

    validate(contractName, payload) {
        const rule = this.rules.get(contractName);

        if (!rule) {
            throw new Error(`[CONTROL_CONTRACT] Missing contract: ${contractName}`);
        }

        const result = rule(payload);

        if (!result.valid) {
            EventBus.emit("contract:rejected", {
                contractName,
                reason: result.reason || "invalid payload",
                timestamp: Date.now()
            });

            throw new Error(`[CONTROL_CONTRACT] Validation failed: ${result.reason}`);
        }

        EventBus.emit("contract:approved", {
            contractName,
            timestamp: Date.now()
        });

        return true;
    }

    list() {
        return Array.from(this.rules.keys());
    }
}

module.exports = new ControlContract();