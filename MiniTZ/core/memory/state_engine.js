const EventBus = require("../events/event_bus");

class StateEngine {
    constructor() {
        this.state = {};
        this.version = 0;
        this.history = [];
    }

    set(key, value, meta = {}) {
        if (!key) {
            throw new Error("[STATE_ENGINE] Missing key");
        }

        const prevValue = this.state[key];

        this.state[key] = value;
        this.version += 1;

        const record = {
            version: this.version,
            key,
            prevValue,
            newValue: value,
            timestamp: Date.now(),
            meta
        };

        this.history.push(record);

        if (this.history.length > 10000) {
            this.history.shift();
        }

        EventBus.emit("state:updated", record);

        return record;
    }

    get(key) {
        return this.state[key];
    }

    delete(key) {
        if (!(key in this.state)) return false;

        const prevValue = this.state[key];
        delete this.state[key];

        this.version += 1;

        const record = {
            version: this.version,
            key,
            prevValue,
            newValue: null,
            deleted: true,
            timestamp: Date.now()
        };

        this.history.push(record);

        EventBus.emit("state:deleted", record);

        return true;
    }

    snapshot() {
        return {
            state: { ...this.state },
            version: this.version,
            historyLength: this.history.length
        };
    }

    rewind(version) {
        if (version < 0 || version > this.version) {
            throw new Error("[STATE_ENGINE] Invalid version rewind");
        }

        const target = this.history.filter(h => h.version <= version);

        const rebuilt = {};

        for (const h of target) {
            if (h.deleted) {
                delete rebuilt[h.key];
            } else {
                rebuilt[h.key] = h.newValue;
            }
        }

        return rebuilt;
    }
}

module.exports = new StateEngine();