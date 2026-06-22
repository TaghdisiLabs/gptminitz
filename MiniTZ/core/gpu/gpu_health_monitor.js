const EventBus = require("../events/event_bus");

class GPUHealthMonitor {
    constructor() {
        this.statusMap = new Map();
        this.failureThreshold = 3;
        this.failureCount = new Map();
    }

    registerGPU(gpuId) {
        if (!gpuId) {
            throw new Error("[GPU_HEALTH] Missing gpuId");
        }

        this.statusMap.set(gpuId, {
            status: "HEALTHY",
            lastCheck: Date.now()
        });

        this.failureCount.set(gpuId, 0);

        EventBus.emit("gpu_health:registered", { gpuId });

        return true;
    }

    heartbeat(gpuId, metrics = {}) {
        const gpu = this.statusMap.get(gpuId);

        if (!gpu) {
            throw new Error("[GPU_HEALTH] GPU not registered");
        }

        gpu.lastCheck = Date.now();

        const failures = this.failureCount.get(gpuId) || 0;

        // simple heuristic failure detection
        if (metrics.error) {
            this.failureCount.set(gpuId, failures + 1);
        } else {
            this.failureCount.set(gpuId, 0);
        }

        if (this.failureCount.get(gpuId) >= this.failureThreshold) {
            gpu.status = "UNHEALTHY";

            EventBus.emit("gpu_health:unhealthy", {
                gpuId,
                failures: this.failureCount.get(gpuId)
            });
        } else {
            gpu.status = "HEALTHY";
        }

        EventBus.emit("gpu_health:heartbeat", {
            gpuId,
            status: gpu.status
        });

        return gpu.status;
    }

    getStatus(gpuId) {
        return this.statusMap.get(gpuId) || null;
    }

    snapshot() {
        return {
            gpus: Object.fromEntries(this.statusMap)
        };
    }
}

module.exports = new GPUHealthMonitor();