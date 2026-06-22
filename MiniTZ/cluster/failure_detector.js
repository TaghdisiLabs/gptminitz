const EventBus = require("../events/event_bus");
const NodeManager = require("./node_manager");
const ClusterHealthMonitor = require("./health_monitor");

class FailureDetector {
    constructor() {
        this.timeoutMs = 30000;
        this.failures = new Map();
    }

    analyzeNode(nodeId) {
        if (!nodeId) {
            throw new Error("[FAILURE_DETECTOR] Missing nodeId");
        }

        const node = NodeManager.listNodes().find(n => n.id === nodeId);

        if (!node) {
            const failure = this.recordFailure(nodeId, "NODE_NOT_REGISTERED");
            return failure;
        }

        const health = ClusterHealthMonitor.getStatus(nodeId);
        const now = Date.now();

        if (!health) {
            return this.recordFailure(nodeId, "HEALTH_NOT_REGISTERED");
        }

        if (health.status === "UNHEALTHY") {
            return this.recordFailure(nodeId, "UNHEALTHY_STATUS");
        }

        if (health.status === "UNREACHABLE") {
            return this.recordFailure(nodeId, "UNREACHABLE_STATUS");
        }

        if (now - health.lastCheck > this.timeoutMs) {
            return this.recordFailure(nodeId, "HEARTBEAT_TIMEOUT");
        }

        this.clearFailure(nodeId);

        return {
            nodeId,
            failed: false,
            reason: "OK",
            timestamp: now
        };
    }

    scanCluster() {
        const nodes = NodeManager.listNodes();

        return nodes.map(node => this.analyzeNode(node.id));
    }

    recordFailure(nodeId, reason) {
        const failure = {
            nodeId,
            failed: true,
            reason,
            timestamp: Date.now()
        };

        this.failures.set(nodeId, failure);

        EventBus.emit("cluster_failure:detected", failure);

        return failure;
    }

    clearFailure(nodeId) {
        if (this.failures.has(nodeId)) {
            this.failures.delete(nodeId);

            EventBus.emit("cluster_failure:cleared", {
                nodeId,
                timestamp: Date.now()
            });
        }

        return true;
    }

    getFailure(nodeId) {
        return this.failures.get(nodeId) || null;
    }

    listFailures() {
        return Array.from(this.failures.values());
    }

    snapshot() {
        return {
            activeFailures: this.failures.size,
            failures: this.listFailures()
        };
    }
}

module.exports = new FailureDetector();
