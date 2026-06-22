const EventBus = require("../events/event_bus");

class MiniKernel {
    constructor() {
        this.initialized = false;
        this.modules = new Map();
    }

    register(name, module) {
        if (!name || !module) {
            throw new Error("[KERNEL] Invalid module registration");
        }

        this.modules.set(name, module);

        EventBus.emit("kernel:module_registered", {
            name,
            timestamp: Date.now()
        });
    }

    get(name) {
        return this.modules.get(name) || null;
    }

    init() {
        if (this.initialized) return;

        this.initialized = true;

        EventBus.emit("kernel:init", {
            status: "READY",
            timestamp: Date.now()
        });
    }

    status() {
        return {
            initialized: this.initialized,
            modules: Array.from(this.modules.keys())
        };
    }
}

module.exports = new MiniKernel();