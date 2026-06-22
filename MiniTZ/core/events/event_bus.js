const EventBus = require("../events/event_bus");

class Scheduler {
    constructor() {
        this.queue = [];
        this.processing = false;
    }

    add(task) {
        if (!task || !task.id) {
            throw new Error("[SCHEDULER] Invalid task");
        }

        this.queue.push(task);

        EventBus.emit("scheduler:task_added", {
            taskId: task.id,
            timestamp: Date.now()
        });
    }

    getNextBatch(limit = 5) {
        return this.queue.splice(0, limit);
    }

    size() {
        return this.queue.length;
    }

    hasWork() {
        return this.queue.length > 0;
    }

    clear() {
        this.queue = [];

        EventBus.emit("scheduler:cleared", {
            timestamp: Date.now()
        });
    }
}

module.exports = new Scheduler();