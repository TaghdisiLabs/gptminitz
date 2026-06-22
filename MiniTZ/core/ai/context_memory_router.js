const EventBus = require("../events/event_bus");

class ContextMemoryRouter {
    constructor() {
        this.routes = new Map();
    }

    register(contextType, handler) {
        if (!contextType || typeof handler !== "function") {
            throw new Error("[CONTEXT_ROUTER] Invalid registration");
        }

        this.routes.set(contextType, handler);

        EventBus.emit("context:route_registered", {
            contextType,
            timestamp: Date.now()
        });
    }

    route(context) {
        if (!context || !context.type) {
            throw new Error("[CONTEXT_ROUTER] Invalid context");
        }

        const handler = this.routes.get(context.type);

        if (!handler) {
            throw new Error(`[CONTEXT_ROUTER] No handler for ${context.type}`);
        }

        const result = handler(context);

        EventBus.emit("context:routed", {
            type: context.type,
            timestamp: Date.now()
        });

        return result;
    }

    listRoutes() {
        return Array.from(this.routes.keys());
    }

    snapshot() {
        return Object.fromEntries(
            Array.from(this.routes.keys()).map(k => [k, "[FUNCTION]"])
        );
    }
}

module.exports = new ContextMemoryRouter();