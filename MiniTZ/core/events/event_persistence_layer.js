const EventBus = require("./event_bus");

class EventPersistenceLayer {
    constructor() {
        this.store = [];
        this.index = new Map();
    }

    persist(eventName, payload) {
        if (!eventName) {
            throw new Error("[EVENT_PERSISTENCE] Missing event name");
        }

        const event = {
            id: this.generateId(),
            eventName,
            payload,
            timestamp: Date.now()
        };

        this.store.push(event);

        if (!this.index.has(eventName)) {
            this.index.set(eventName, []);
        }

        this.index.get(eventName).push(event.id);

        EventBus.emit("event:persisted", {
            eventName,
            id: event.id
        });

        return event;
    }

    getById(id) {
        return this.store.find(e => e.id === id) || null;
    }

    getByEvent(eventName) {
        const ids = this.index.get(eventName) || [];
        return this.store.filter(e => ids.includes(e.id));
    }

    replay(limit = 100) {
        return this.store.slice(-limit);
    }

    clear() {
        this.store = [];
        this.index.clear();

        EventBus.emit("event:cleared", {
            timestamp: Date.now()
        });
    }

    generateId() {
        return `evt_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    }

    snapshot() {
        return {
            totalEvents: this.store.length,
            indexedTypes: Array.from(this.index.keys())
        };
    }
}

module.exports = new EventPersistenceLayer();