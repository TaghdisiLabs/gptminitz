const EventBus = require("../events/event_bus");
const GPUExecutionScheduler = require("./gpu_execution_scheduler");
const GPUMemoryManager = require("./gpu_memory_manager");
const GPUHealthMonitor = require("./gpu_health_monitor");

class GPUInferenceRouter {
    constructor() {
        this.modelRoutes = new Map();
    }

    registerModel(modelName, config = {}) {
        if (!modelName) {
            throw new Error("[GPU_INFERENCE_ROUTER] Missing model name");
        }

        this.modelRoutes.set(modelName, {
            memory: config.memory || 1024,
            priority: config.priority || 1
        });

        EventBus.emit("gpu_inference:model_registered", {
            modelName,
            config
        });

        return true;
    }

    async runInference(modelName, input, gpuId) {
        const model = this.modelRoutes.get(modelName);

        if (!model) {
            throw new Error(`[GPU_INFERENCE_ROUTER] Unknown model: ${modelName}`);
        }

        const gpuStatus = GPUHealthMonitor.getStatus(gpuId);

        if (!gpuStatus || gpuStatus.status !== "HEALTHY") {
            throw new Error("[GPU_INFERENCE_ROUTER] GPU not healthy");
        }

        const taskId = `inf_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

        GPUMemoryManager.allocate(taskId, gpuId, model.memory);

        const task = {
            id: taskId,
            type: "gpu_inference",
            input,
            model: modelName
        };

        EventBus.emit("gpu_inference:started", {
            taskId,
            modelName,
            gpuId
        });

        const result = await GPUExecutionScheduler.execute
            ? GPUExecutionScheduler.execute(task)
            : GPUExecutionScheduler.schedule(task);

        GPUMemoryManager.release(taskId);

        EventBus.emit("gpu_inference:completed", {
            taskId,
            modelName
        });

        return result;
    }

    snapshot() {
        return {
            models: Array.from(this.modelRoutes.keys())
        };
    }
}

module.exports = new GPUInferenceRouter();