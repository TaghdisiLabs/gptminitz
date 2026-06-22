const EventBus = require("../events/event_bus");
const ExecutionEngine = require("./execution_engine");
const PipelineExecutor = require("./pipeline_executor");

class TaskRouter {
    constructor() {
        this.routes = new Map();
    }

    register(routeType, handler) {
        if (!routeType || typeof handler !== "function") {
            throw new Error("[TASK_ROUTER] Invalid route registration");
        }

        this.routes.set(routeType, handler);

        EventBus.emit("task_route:registered", {
            routeType,
            timestamp: Date.now()
        });
    }

    route(task) {
        if (!task || !task.type) {
            throw new Error("[TASK_ROUTER] Invalid task");
        }

        EventBus.emit("task:routed", {
            taskId: task.id,
            type: task.type
        });

        // 1. pipeline route
        if (task.pipeline) {
            return PipelineExecutor.execute(task.pipeline, task.input);
        }

        // 2. custom route
        const handler = this.routes.get(task.type);
        if (handler) {
            return handler(task);
        }

        // 3. fallback execution engine
        return ExecutionEngine.execute(task);
    }

    list() {
        return Array.from(this.routes.keys());
    }

    snapshot() {
        return {
            routes: this.list()
        };
    }
}

module.exports = new TaskRouter();