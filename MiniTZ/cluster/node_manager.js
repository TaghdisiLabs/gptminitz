const EventBus = require("../events/event_bus");

class NodeManager {
    constructor() {
        this.nodes = new Map();
        this.leader = null;
    }

    registerNode(node) {
        if (!node || !node.id) {
            throw new Error("[NODE_MANAGER] Invalid node");
        }

        this.nodes.set(node.id, {
            ...node,
            status: "ACTIVE",
            lastSeen: Date.now()
        });

        EventBus.emit("cluster:node_registered", {
            nodeId: node.id
        });

        if (!this.leader) {
            this.leader = node.id;
            EventBus.emit("cluster:leader_elected", {
                leader: this.leader
            });
        }

        return true;
    }

    heartbeat(nodeId) {
        const node = this.nodes.get(nodeId);

        if (!node) {
            throw new Error("[NODE_MANAGER] Node not found");
        }

        node.lastSeen = Date.now();
        node.status = "ACTIVE";

        EventBus.emit("cluster:heartbeat", {
            nodeId
        });

        return true;
    }

    removeNode(nodeId) {
        const exists = this.nodes.has(nodeId);

        if (!exists) return false;

        this.nodes.delete(nodeId);

        if (this.leader === nodeId) {
            this.leader = this.nodes.keys().next().value || null;

            EventBus.emit("cluster:leader_changed", {
                newLeader: this.leader
            });
        }

        EventBus.emit("cluster:node_removed", {
            nodeId
        });

        return true;
    }

    listNodes() {
        return Array.from(this.nodes.values());
    }

    snapshot() {
        return {
            totalNodes: this.nodes.size,
            leader: this.leader
        };
    }
}

module.exports = new NodeManager();