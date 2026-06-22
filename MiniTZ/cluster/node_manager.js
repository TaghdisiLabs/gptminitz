const EventBus = require("../events/event_bus");

class NodeManager {
    constructor() {
        this.nodes = new Map();
        this.leaderNodeId = null;

        this.allowedStatuses = new Set([
            "ACTIVE",
            "DEGRADED",
            "DRAINING",
            "UNREACHABLE",
            "REMOVED"
        ]);
    }

    registerNode(node) {
        if (!node || !node.id) {
            throw new Error("[NODE_MANAGER] Invalid node registration");
        }

        const now = Date.now();

        const record = {
            id: node.id,
            address: node.address || null,
            role: node.role || "WORKER",
            status: "ACTIVE",
            capacity: Number.isFinite(node.capacity) ? node.capacity : 100,
            load: Number.isFinite(node.load) ? node.load : 0,
            metadata: node.metadata || {},
            registeredAt: now,
            lastSeen: now
        };

        this.nodes.set(record.id, record);

        this.recalculateLeader();

        EventBus.emit("cluster:node_registered", {
            nodeId: record.id,
            role: record.role,
            timestamp: now
        });

        return record;
    }

    updateNode(nodeId, patch = {}) {
        const node = this.getNode(nodeId);

        if (!node) {
            throw new Error("[NODE_MANAGER] Node not found");
        }

        if (patch.status && !this.allowedStatuses.has(patch.status)) {
            throw new Error(`[NODE_MANAGER] Invalid node status: ${patch.status}`);
        }

        const updated = {
            ...node,
            ...patch,
            id: node.id,
            lastSeen: patch.lastSeen || node.lastSeen
        };

        this.nodes.set(nodeId, updated);

        if (patch.status) {
            this.recalculateLeader();
        }

        EventBus.emit("cluster:node_updated", {
            nodeId,
            patch,
            timestamp: Date.now()
        });

        return updated;
    }

    heartbeat(nodeId, telemetry = {}) {
        const node = this.getNode(nodeId);

        if (!node) {
            throw new Error("[NODE_MANAGER] Node not found");
        }

        const updated = {
            ...node,
            status: telemetry.status || node.status || "ACTIVE",
            load: Number.isFinite(telemetry.load) ? telemetry.load : node.load,
            capacity: Number.isFinite(telemetry.capacity) ? telemetry.capacity : node.capacity,
            metadata: {
                ...node.metadata,
                ...(telemetry.metadata || {})
            },
            lastSeen: Date.now()
        };

        if (!this.allowedStatuses.has(updated.status)) {
            throw new Error(`[NODE_MANAGER] Invalid heartbeat status: ${updated.status}`);
        }

        this.nodes.set(nodeId, updated);

        EventBus.emit("cluster:node_heartbeat", {
            nodeId,
            status: updated.status,
            load: updated.load,
            timestamp: updated.lastSeen
        });

        return updated;
    }

    markStatus(nodeId, status) {
        if (!this.allowedStatuses.has(status)) {
            throw new Error(`[NODE_MANAGER] Invalid node status: ${status}`);
        }

        return this.updateNode(nodeId, {
            status,
            lastSeen: Date.now()
        });
    }

    removeNode(nodeId) {
        const node = this.getNode(nodeId);

        if (!node) {
            return false;
        }

        this.nodes.set(nodeId, {
            ...node,
            status: "REMOVED",
            removedAt: Date.now()
        });

        this.recalculateLeader();

        EventBus.emit("cluster:node_removed", {
            nodeId,
            timestamp: Date.now()
        });

        return true;
    }

    getNode(nodeId) {
        return this.nodes.get(nodeId) || null;
    }

    listNodes() {
        return Array.from(this.nodes.values())
            .filter(node => node.status !== "REMOVED")
            .sort((a, b) => a.id.localeCompare(b.id));
    }

    getActiveNodes() {
        return this.listNodes()
            .filter(node => node.status === "ACTIVE");
    }

    recalculateLeader() {
        const activeNodes = this.getActiveNodes();

        const nextLeader = activeNodes.length > 0
            ? activeNodes.map(node => node.id).sort()[0]
            : null;

        if (this.leaderNodeId !== nextLeader) {
            this.leaderNodeId = nextLeader;

            EventBus.emit("cluster:leader_selected", {
                leaderNodeId: this.leaderNodeId,
                timestamp: Date.now()
            });
        }

        return this.leaderNodeId;
    }

    getLeader() {
        if (!this.leaderNodeId) {
            return this.recalculateLeader();
        }

        return this.leaderNodeId;
    }

    snapshot() {
        return {
            totalNodes: this.listNodes().length,
            activeNodes: this.getActiveNodes().length,
            leaderNodeId: this.getLeader(),
            nodes: this.listNodes()
        };
    }
}

module.exports = new NodeManager();
