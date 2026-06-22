const EventBus = require("../events/event_bus");

class ToolRouter {
    constructor() {
        this.tools = new Map();
    }

    register(toolName, handler) {
        if (!toolName || typeof handler !== "function") {
            throw new Error("[TOOL_ROUTER] Invalid tool registration");
        }

        this.tools.set(toolName, handler);

        EventBus.emit("tool:registered", {
            toolName,
            timestamp: Date.now()
        });
    }

    route(toolName, payload) {
        if (!toolName) {
            throw new Error("[TOOL_ROUTER] Missing toolName");
        }

        const tool = this.tools.get(toolName);

        if (!tool) {
            throw new Error(`[TOOL_ROUTER] Tool not found: ${toolName}`);
        }

        const result = tool(payload);

        EventBus.emit("tool:executed", {
            toolName,
            timestamp: Date.now()
        });

        return result;
    }

    list() {
        return Array.from(this.tools.keys());
    }

    has(toolName) {
        return this.tools.has(toolName);
    }

    snapshot() {
        return Object.fromEntries(
            Array.from(this.tools.keys()).map(k => [k, "[FUNCTION]"])
        );
    }
}

module.exports = new ToolRouter();