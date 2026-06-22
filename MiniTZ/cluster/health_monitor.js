const EventBus = require("../events/event_bus");
const NodeManager = require("./node_manager");

class ClusterHealthMonitor {
    constructor() {
        this.healthMap = new Map();
        this.unhealthyThreshold = 3;
        this.failureCount = new Map();
    }

    registerNode(nodeId) {
        if (!nodeId) {
            throw new Error("[CLUSTER_HEALTH] Missing nodeId");
        }

        this.healthMap.set(nodeId, {
            status: "HEALTHY",
            lastCheck: Date.now()
        });

        this.failureCount.set(nodeId, 0);

        EventBus.emit("cluster_health:registered", {
            nodeId
        });

        return true;
    }

    heartbeat(nodeId, metrics = {}) {
        const node = this.healthMap.get(nodeId);

        if (!node) {
            throw new Error("[CLUSTER_HEALTH] Node not registered");
        }

        node.lastCheck = Date.now();

        const failures = this.failureCount.get(nodeId) || 0;

        if (metrics.error) {
            this.failureCount.set(nodeId, failures + 1);
        } else {
            this.failureCount.set(nodeId, 0);
        }

        const currentFailures = this.failureCount.get(nodeId);

        if (currentFailures >= this.unhealthyThreshold) {
            node.status = "UNHEALTHY";

            EventBus.emit("cluster_health:unhealthy", {
                nodeId,
                failures: currentFailures
            });
        } else {
            node.status = "HEALTHY";
        }

        EventBus.emit("cluster_health:heartbeat", {
            nodeId,
            status: node.status
        });

        return node.status;
    }

    markUnreachable(nodeId) {
        const node = this.healthMap.get(nodeId);

        if (!node) return false;

        node.status = "UNREACHABLE";

        EventBus.emit("cluster_health:unreachable", {
            nodeId
        });

        return true;
    }

    getStatus(nodeId) {
        return this.healthMap.get(nodeId) || null;
    }

    snapshot() {
        return {
            nodes: Object.fromEntries(this.healthMap)
        };
    }
}

module.exports = new ClusterHealthMonitor();