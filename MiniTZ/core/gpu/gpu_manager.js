const EventBus = require("../events/event_bus");

class GPUManager {
    constructor() {
        this.gpus = new Map();
        this.allocated = new Map();
    }

    registerGPU(gpu) {
        if (!gpu || !gpu.id) {
            throw new Error("[GPU_MANAGER] Invalid GPU");
        }

        this.gpus.set(gpu.id, {
            ...gpu,
            status: "IDLE",
            load: 0
        });

        EventBus.emit("gpu:registered", {
            gpuId: gpu.id,
            timestamp: Date.now()
        });

        return true;
    }

    allocate(gpuId, taskId) {
        const gpu = this.gpus.get(gpuId);

        if (!gpu) {
            throw new Error("[GPU_MANAGER] GPU not found");
        }

        if (gpu.status === "BUSY") {
            throw new Error("[GPU_MANAGER] GPU already in use");
        }

        gpu.status = "BUSY";
        gpu.load += 1;

        this.allocated.set(taskId, gpuId);

        EventBus.emit("gpu:allocated", {
            gpuId,
            taskId
        });

        return gpu;
    }

    release(taskId) {
        const gpuId = this.allocated.get(taskId);

        if (!gpuId) return false;

        const gpu = this.gpus.get(gpuId);

        if (gpu) {
            gpu.status = "IDLE";
            gpu.load = Math.max(0, gpu.load - 1);
        }

        this.allocated.delete(taskId);

        EventBus.emit("gpu:released", {
            gpuId,
            taskId
        });

        return true;
    }

    snapshot() {
        return {
            gpus: Array.from(this.gpus.values()),
            allocated: Object.fromEntries(this.allocated)
        };
    }
}

module.exports = new GPUManager();