const EventBus = require("../events/event_bus");

class Scheduler {
    constructor() {
        this.queue = [];
        this.running = false;
    }

    add(task) {
        if (!task || !task.id) {
            throw new Error("[SCHEDULER] Invalid task");
        }

        this.queue.push({
            ...task,
            createdAt: Date.now(),
            status: "QUEUED"
        });

        EventBus.emit("scheduler:task_added", {
            taskId: task.id,
            timestamp: Date.now()
        });
    }

    next() {
        if (this.queue.length === 0) return null;

        return this.queue.shift();
    }

    peek() {
        return this.queue.length > 0 ? this.queue[0] : null;
    }

    size() {
        return this.queue.length;
    }

    isEmpty() {
        return this.queue.length === 0;
    }

    clear() {
        this.queue = [];

        EventBus.emit("scheduler:cleared", {
            timestamp: Date.now()
        });
    }

    getAll() {
        return this.queue;
    }
}

module.exports = new Scheduler();