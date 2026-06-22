class EventBus {
    constructor() {
        this.listeners = new Map();
        this.history = [];
    }

    on(event, handler) {
        if (!event || typeof handler !== "function") {
            throw new Error("[EVENT_BUS] Invalid listener registration");
        }

        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        this.listeners.get(event).push(handler);

        return true;
    }

    emit(event, payload = {}) {
        if (!event) {
            throw new Error("[EVENT_BUS] Missing event name");
        }

        const entry = {
            event,
            payload,
            timestamp: Date.now()
        };

        this.history.push(entry);

        const handlers = this.listeners.get(event);

        if (handlers && handlers.length > 0) {
            for (const handler of handlers) {
                try {
                    handler(payload);
                } catch (err) {
                    console.error(`[EVENT_BUS] handler error on ${event}`, err);
                }
            }
        }

        return true;
    }

    off(event, handler) {
        const handlers = this.listeners.get(event);

        if (!handlers) return false;

        const index = handlers.indexOf(handler);

        if (index !== -1) {
            handlers.splice(index, 1);
        }

        return true;
    }

    once(event, handler) {
        const wrapper = (payload) => {
            handler(payload);
            this.off(event, wrapper);
        };

        return this.on(event, wrapper);
    }

    getHistory(limit = 100) {
        return this.history.slice(-limit);
    }

    snapshot() {
        const snapshot = {};

        for (const [event, handlers] of this.listeners.entries()) {
            snapshot[event] = handlers.length;
        }

        return snapshot;
    }
}

module.exports = new EventBus();