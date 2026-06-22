const EventBus = require("../events/event_bus");

class OutputStabilizer {
    constructor() {
        this.cache = new Map();
    }

    stabilize(taskId, rawOutput) {
        if (!taskId) {
            throw new Error("[OUTPUT_STABILIZER] Missing taskId");
        }

        const stabilized = {
            taskId,
            output: this.normalize(rawOutput),
            hash: this.hashOutput(rawOutput),
            timestamp: Date.now()
        };

        this.cache.set(taskId, stabilized);

        EventBus.emit("output:stabilized", {
            taskId,
            hash: stabilized.hash
        });

        return stabilized;
    }

    normalize(output) {
        if (!output) return null;

        if (typeof output === "string") {
            return output.trim().replace(/\s+/g, " ");
        }

        if (typeof output === "object") {
            return JSON.parse(JSON.stringify(output));
        }

        return output;
    }

    hashOutput(output) {
        const str = JSON.stringify(output || {});
        let hash = 0;

        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash |= 0;
        }

        return hash.toString();
    }

    get(taskId) {
        return this.cache.get(taskId) || null;
    }

    snapshot() {
        return Object.fromEntries(this.cache);
    }
}

module.exports = new OutputStabilizer();