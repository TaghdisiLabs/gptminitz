const EventBus = require("../events/event_bus");

class Runtime {
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
        this.running = false;
        this.interval = null;
        this.tickRate = 100; // ms deterministic cycle
    }

    async start() {
        if (!this.orchestrator) {
            throw new Error("[RUNTIME] Orchestrator not injected");
        }

        this.running = true;

        EventBus.emit("runtime:start", {
            timestamp: Date.now()
        });

        this.loop();
    }

    async loop() {
        this.interval = setInterval(async () => {
            try {
                await this.tick();
            } catch (err) {
                EventBus.emit("runtime:error", {
                    error: err.message,
                    timestamp: Date.now()
                });
            }
        }, this.tickRate);
    }

    async tick() {
        if (!this.running) return;

        const taskBatch = await this.orchestrator.fetchTasks();

        if (!taskBatch || taskBatch.length === 0) return;

        for (const task of taskBatch) {
            await this.orchestrator.process(task);
        }

        EventBus.emit("runtime:tick_complete", {
            count: taskBatch.length,
            timestamp: Date.now()
        });
    }

    stop() {
        this.running = false;

        if (this.interval) {
            clearInterval(this.interval);
        }

        EventBus.emit("runtime:stop", {
            timestamp: Date.now()
        });
    }
}

module.exports = Runtime;