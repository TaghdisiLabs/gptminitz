const EventBus = require("../events/event_bus");
const HealthMonitor = require("./health_monitor");

class FailureDetector {
    constructor() {
        this.detectionWindowMs = 10000; // 10s
        this.suspectedNodes = new Map();
    }

    analyze(nodeId) {
        const status = HealthMonitor.getStatus(nodeId);

        if (!status) {
            throw new Error("[FAILURE_DETECTOR] Unknown node");
        }

        const now = Date.now();
        const lastCheck = status.lastCheck || 0;

        // timeout-based failure detection
        if (now - lastCheck > this.detectionWindowMs) {
            this.suspectedNodes.set(nodeId, {
                reason: "TIMEOUT",
                detectedAt: now
            });

            EventBus.emit("failure:detected", {
                nodeId,
                reason: "TIMEOUT"
            });

            return "FAILED";
        }

        if (status.status === "UNHEALTHY") {
            this.suspectedNodes.set(nodeId, {
                reason: "UNHEALTHY_STATUS",
                detectedAt: now
            });

            EventBus.emit("failure:detected", {
                nodeId,
                reason: "UNHEALTHY_STATUS"
            });

            return "FAILED";
        }

        return "OK";
    }

    getSuspicions() {
        return Array.from(this.suspectedNodes.entries()).map(([nodeId, data]) => ({
            nodeId,
            ...data
        }));
    }

    clear(nodeId) {
        if (!nodeId) return false;

        this.suspectedNodes.delete(nodeId);

        EventBus.emit("failure:cleared", {
            nodeId
        });

        return true;
    }

    snapshot() {
        return {
            suspected: this.suspectedNodes.size
        };
    }
}

module.exports = new FailureDetector();