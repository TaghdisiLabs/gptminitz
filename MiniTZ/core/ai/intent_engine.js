const EventBus = require("../events/event_bus");

class IntentEngine {
    constructor() {}

    analyze(input) {
        if (!input) {
            throw new Error("[INTENT_ENGINE] Empty input");
        }

        const text = typeof input === "string" ? input : input.prompt || "";

        const intent = {
            raw: input,
            type: this.detectType(text),
            entities: this.extractEntities(text),
            confidence: this.scoreConfidence(text),
            timestamp: Date.now()
        };

        EventBus.emit("intent:analyzed", intent);

        return intent;
    }

    detectType(text) {
        const lower = text.toLowerCase();

        if (lower.includes("create") || lower.includes("build")) return "BUILD";
        if (lower.includes("fix") || lower.includes("debug")) return "DEBUG";
        if (lower.includes("explain")) return "EXPLAIN";
        if (lower.includes("run")) return "EXECUTE";

        return "GENERAL";
    }

    extractEntities(text) {
        return text.match(/[a-zA-Z0-9_]+/g) || [];
    }

    scoreConfidence(text) {
        if (!text) return 0;
        return Math.min(1, text.length / 200);
    }
}

module.exports = IntentEngine;