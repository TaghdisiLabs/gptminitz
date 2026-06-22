const EventBus = require("../events/event_bus");
const LoadBalancer = require("./load_balancer");
const GPUManager = require("./gpu_manager");
const GPULeaseGuard = require("./gpu_lease_guard");

class GPUExecutionScheduler {
    constructor() {
        this.queue = [];
        this.running = new Map();
        this.maxConcurrent = 2;
    }

    schedule(task) {
        if (!task || !task.id) {
            throw new Error("[GPU_SCHEDULER] Invalid task");
        }

        this.queue.push({
            ...task,
            status: "QUEUED",
            queuedAt: Date.now()
        });

        EventBus.emit("gpu_task:queued", {
            taskId: task.id
        });

        this.process();

        return task;
    }

    async process() {
        if (this.running.size >= this.maxConcurrent) return;

        const task = this.queue.shift();
        if (!task) return;

        try {
            const gpu = LoadBalancer.selectGPU(task.id);

            GPUManager.allocate(gpu.id, task.id);
            const lease = GPULeaseGuard.createLease(task.id, gpu.id);

            this.running.set(task.id, task);

            task.status = "RUNNING";

            EventBus.emit("gpu_task:started", {
                taskId: task.id,
                gpuId: gpu.id
            });

            // simulate execution
            const result = await this.execute(task, gpu);

            task.status = "COMPLETED";
            task.result = result;
            task.completedAt = Date.now();

            GPULeaseGuard.revokeLease(task.id);
            GPUManager.release(task.id);

            this.running.delete(task.id);

            EventBus.emit("gpu_task:completed", {
                taskId: task.id,
                gpuId: gpu.id
            });

        } catch (err) {
            task.status = "FAILED";
            task.error = err.message;

            this.running.delete(task.id);

            EventBus.emit("gpu_task:failed", {
                taskId: task.id,
                error: err.message
            });
        }

        // continue processing queue
        if (this.queue.length > 0) {
            setImmediate(() => this.process());
        }
    }

    async execute(task, gpu) {
        return {
            taskId: task.id,
            gpuId: gpu.id,
            output: `GPU_EXECUTED:${task.type || "unknown"}`
        };
    }

    snapshot() {
        return {
            queue: this.queue.length,
            running: this.running.size
        };
    }
}

module.exports = new GPUExecutionScheduler();