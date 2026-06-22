const EventBus = require("../events/event_bus");
const ContextStore = require("../memory/context_store");

class AIContextBridge {
    constructor() {}

    push(context) {
        if (!context || !context.id) {
            throw new Error("[AI_CONTEXT_BRIDGE] Invalid context");
        }

        ContextStore.set(context.id, context);

        EventBus.emit("context:stored", {
            contextId: context.id,
            timestamp: Date.now()
        });

        return true;
    }

    pull(contextId) {
        if (!contextId) {
            throw new Error("[AI_CONTEXT_BRIDGE] Missing contextId");
        }

        const context = ContextStore.get(contextId);

        EventBus.emit("context:retrieved", {
            contextId,
            found: !!context,
            timestamp: Date.now()
        });

        return context;
    }

    update(contextId, patch) {
        const existing = ContextStore.get(contextId);

        if (!existing) {
            throw new Error("[AI_CONTEXT_BRIDGE] Context not found");
        }

        const updated = {
            ...existing,
            ...patch,
            updatedAt: Date.now()
        };

        ContextStore.set(contextId, updated);

        EventBus.emit("context:updated", {
            contextId,
            timestamp: Date.now()
        });

        return updated;
    }

    delete(contextId) {
        const exists = ContextStore.get(contextId);

        if (!exists) {
            return false;
        }

        ContextStore.delete(contextId);

        EventBus.emit("context:deleted", {
            contextId,
            timestamp: Date.now()
        });

        return true;
    }

    snapshot() {
        return ContextStore.snapshot();
    }
}

module.exports = new AIContextBridge();