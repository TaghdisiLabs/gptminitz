const EventBus = require("../events/event_bus");

class ContextStore {
    constructor() {
        this.store = new Map();
    }

    set(key, value) {
        if (!key) {
            throw new Error("[CONTEXT_STORE] Missing key");
        }

        this.store.set(key, {
            value,
            timestamp: Date.now(),
            updatedAt: Date.now()
        });

        EventBus.emit("context_store:set", {
            key,
            timestamp: Date.now()
        });

        return true;
    }

    get(key) {
        const entry = this.store.get(key);

        if (!entry) return null;

        return entry.value;
    }

    delete(key) {
        const exists = this.store.has(key);

        if (!exists) return false;

        this.store.delete(key);

        EventBus.emit("context_store:delete", {
            key,
            timestamp: Date.now()
        });

        return true;
    }

    has(key) {
        return this.store.has(key);
    }

    keys() {
        return Array.from(this.store.keys());
    }

    snapshot() {
        const result = {};

        for (const [key, value] of this.store.entries()) {
            result[key] = value;
        }

        return result;
    }
}

module.exports = new ContextStore();