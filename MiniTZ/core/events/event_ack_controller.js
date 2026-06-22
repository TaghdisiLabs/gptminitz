const EventBus = require("./event_bus");

class EventAckController {
    constructor() {
        this.pending = new Map();
        this.ackLog = [];
    }

    send(eventName, payload) {
        if (!eventName) {
            throw new Error("[EVENT_ACK] Missing event name");
        }

        const eventId = this.generateId();

        const event = {
            id: eventId,
            eventName,
            payload,
            status: "PENDING",
            createdAt: Date.now()
        };

        this.pending.set(eventId, event);

        EventBus.emit(eventName, {
            id: eventId,
            payload
        });

        return event;
    }

    ack(eventId) {
        const event = this.pending.get(eventId);

        if (!event) {
            throw new Error("[EVENT_ACK] Event not found");
        }

        event.status = "ACKED";
        event.ackedAt = Date.now();

        this.ackLog.push(event);
        this.pending.delete(eventId);

        EventBus.emit("event:acknowledged", {
            eventId,
            timestamp: Date.now()
        });

        return event;
    }

    fail(eventId, reason) {
        const event = this.pending.get(eventId);

        if (!event) {
            throw new Error("[EVENT_ACK] Event not found");
        }

        event.status = "FAILED";
        event.reason = reason;
        event.failedAt = Date.now();

        this.ackLog.push(event);
        this.pending.delete(eventId);

        EventBus.emit("event:failed", {
            eventId,
            reason
        });

        return event;
    }

    getPending() {
        return Array.from(this.pending.values());
    }

    getAckLog(limit = 100) {
        return this.ackLog.slice(-limit);
    }

    generateId() {
        return `ack_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    }

    snapshot() {
        return {
            pending: this.pending.size,
            acknowledged: this.ackLog.length
        };
    }
}

module.exports = new EventAckController();