const EventBus = require("../events/event_bus");

class GPUMemoryManager {
    constructor() {
        this.memoryMap = new Map(); // gpuId -> memory usage
        this.allocations = new Map(); // taskId -> memory block
        this.maxMemoryPerGPU = 16384; // MB (default simulated)
    }

    registerGPU(gpuId, totalMemory = this.maxMemoryPerGPU) {
        if (!gpuId) {
            throw new Error("[GPU_MEMORY] Missing gpuId");
        }

        this.memoryMap.set(gpuId, {
            total: totalMemory,
            used: 0
        });

        EventBus.emit("gpu_memory:registered", {
            gpuId,
            totalMemory
        });

        return true;
    }

    allocate(taskId, gpuId, memoryMB) {
        const gpu = this.memoryMap.get(gpuId);

        if (!gpu) {
            throw new Error("[GPU_MEMORY] GPU not registered");
        }

        if (gpu.used + memoryMB > gpu.total) {
            throw new Error("[GPU_MEMORY] Insufficient VRAM");
        }

        gpu.used += memoryMB;

        this.allocations.set(taskId, {
            gpuId,
            memoryMB,
            allocatedAt: Date.now()
        });

        EventBus.emit("gpu_memory:allocated", {
            taskId,
            gpuId,
            memoryMB
        });

        return true;
    }

    release(taskId) {
        const allocation = this.allocations.get(taskId);

        if (!allocation) return false;

        const gpu = this.memoryMap.get(allocation.gpuId);

        if (gpu) {
            gpu.used = Math.max(0, gpu.used - allocation.memoryMB);
        }

        this.allocations.delete(taskId);

        EventBus.emit("gpu_memory:released", {
            taskId,
            gpuId: allocation.gpuId
        });

        return true;
    }

    getGPUStatus(gpuId) {
        return this.memoryMap.get(gpuId) || null;
    }

    snapshot() {
        return {
            gpus: Object.fromEntries(this.memoryMap),
            allocations: this.allocations.size
        };
    }
}

module.exports = new GPUMemoryManager();