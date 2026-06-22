const EventBus = require("../events/event_bus");
const NodeManager = require("./node_manager");

class ClusterHealthMonitor {
    constructor() {
        this.health = new Map();

        this.thresholds = {
            heartbeatTimeoutMs: 30000,
            degradedLoad: 85,
            unhealthyLoad: 98,
            degradedMemoryPercent: 85,
            unhealthyMemoryPercent: 95,
            degradedErrorRate: 0.1,
            unhealthyErrorRate: 0.25
        };
    }

    registerNode(nodeId) {
        if (!nodeId) {
            throw new Error("[CLUSTER_HEALTH] Missing nodeId");
        }

        const now = Date.now();

        const record = {
            nodeId,
            status: "HEALTHY",
            reason: "REGISTERED",
            metrics: {},
            lastCheck: now,
            lastHeartbeat: now
        };

        this.health.set(nodeId, record);

        EventBus.emit("cluster_health:registered", {
            nodeId,
            timestamp: now
        });

        return record;
    }

    heartbeat(nodeId, metrics = {}) {
        if (!nodeId) {
            throw new Error("[CLUSTER_HEALTH] Missing nodeId");
        }

        if (!this.health.has(nodeId)) {
            this.registerNode(nodeId);
        }

        const evaluation = this.evaluateMetrics(nodeId, metrics);
        const now = Date.now();

        const record = {
            nodeId,
            status: evaluation.status,
            reason: evaluation.reason,
            metrics,
            lastCheck: now,
            lastHeartbeat: now
        };

        this.health.set(nodeId, record);

        if (evaluation.status === "HEALTHY") {
            NodeManager.markStatus(nodeId, "ACTIVE");
        }

        if (evaluation.status === "DEGRADED") {
            NodeManager.markStatus(nodeId, "DEGRADED");
        }

        if (evaluation.status === "UNHEALTHY") {
            NodeManager.markStatus(nodeId, "UNREACHABLE");
        }

        EventBus.emit("cluster_health:heartbeat", {
            nodeId,
            status: record.status,
            reason: record.reason,
            timestamp: now
        });

        return record;
    }

    evaluateNode(nodeId) {
        const record = this.health.get(nodeId);

        if (!record) {
            return this.registerNode(nodeId);
        }

        const now = Date.now();

        if (now - record.lastHeartbeat > this.thresholds.heartbeatTimeoutMs) {
            const failed = {
                ...record,
                status: "UNREACHABLE",
                reason: "HEARTBEAT_TIMEOUT",
                lastCheck: now
            };

            this.health.set(nodeId, failed);
            NodeManager.markStatus(nodeId, "UNREACHABLE");

            EventBus.emit("cluster_health:unreachable", {
                nodeId,
                timestamp: now
            });

            return failed;
        }

        const evaluation = this.evaluateMetrics(nodeId, record.metrics);

        const updated = {
            ...record,
            status: evaluation.status,
            reason: evaluation.reason,
            lastCheck: now
        };

        this.health.set(nodeId, updated);

        return updated;
    }

    evaluateMetrics(nodeId, metrics = {}) {
        const load = Number.isFinite(metrics.load) ? metrics.load : 0;
        const memoryPercent = Number.isFinite(metrics.memoryPercent) ? metrics.memoryPercent : 0;
        const errorRate = Number.isFinite(metrics.errorRate) ? metrics.errorRate : 0;

        if (
            load >= this.thresholds.unhealthyLoad ||
            memoryPercent >= this.thresholds.unhealthyMemoryPercent ||
            errorRate >= this.thresholds.unhealthyErrorRate ||
            metrics.error === true
        ) {
            return {
                nodeId,
                status: "UNHEALTHY",
                reason: "THRESHOLD_EXCEEDED"
            };
        }

        if (
            load >= this.thresholds.degradedLoad ||
            memoryPercent >= this.thresholds.degradedMemoryPercent ||
            errorRate >= this.thresholds.degradedErrorRate
        ) {
            return {
                nodeId,
                status: "DEGRADED",
                reason: "RESOURCE_PRESSURE"
            };
        }

        return {
            nodeId,
            status: "HEALTHY",
            reason: "OK"
        };
    }

    scanCluster() {
        const nodes = NodeManager.listNodes();

        return nodes.map(node => this.evaluateNode(node.id));
    }

    markUnreachable(nodeId, reason = "MANUAL_UNREACHABLE") {
        if (!nodeId) {
            throw new Error("[CLUSTER_HEALTH] Missing nodeId");
        }

        const now = Date.now();

        const record = {
            nodeId,
            status: "UNREACHABLE",
            reason,
            metrics: {},
            lastCheck: now,
            lastHeartbeat: 0
        };

        this.health.set(nodeId, record);
        NodeManager.markStatus(nodeId, "UNREACHABLE");

        EventBus.emit("cluster_health:unreachable", {
            nodeId,
            reason,
            timestamp: now
        });

        return record;
    }

    getStatus(nodeId) {
        return this.health.get(nodeId) || null;
    }

    snapshot() {
        return {
            nodes: Array.from(this.health.values())
                .sort((a, b) => a.nodeId.localeCompare(b.nodeId))
        };
    }
}

module.exports = new ClusterHealthMonitor();
