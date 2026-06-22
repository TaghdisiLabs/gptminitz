const EventBus = require("../events/event_bus");

class ResourceManager {
    constructor() {
        this.resources = new Map();
        this.limits = {
            cpu: 100,
            memory: 1024,
            gpu: 1
        };
    }

    allocate(taskId, resourceRequest) {
        if (!taskId) {
            throw new Error("[RESOURCE_MANAGER] Missing taskId");
        }

        const allocation = {
            cpu: Math.min(resourceRequest.cpu || 0, this.limits.cpu),
            memory: Math.min(resourceRequest.memory || 0, this.limits.memory),
            gpu: Math.min(resourceRequest.gpu || 0, this.limits.gpu),
            timestamp: Date.now()
        };

        this.resources.set(taskId, allocation);

        EventBus.emit("resource:allocated", {
            taskId,
            allocation
        });

        return allocation;
    }

    release(taskId) {
        if (!this.resources.has(taskId)) return;

        this.resources.delete(taskId);

        EventBus.emit("resource:released", {
            taskId,
            timestamp: Date.now()
        });
    }

    get(taskId) {
        return this.resources.get(taskId) || null;
    }

    status() {
        return {
            active: this.resources.size,
            limits: this.limits
        };
    }
}

module.exports = new ResourceManager();