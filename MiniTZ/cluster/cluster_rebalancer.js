const EventBus = require("../events/event_bus");
const NodeManager = require("./node_manager");
const FailureDetector = require("./failure_detector");

class ClusterRebalancer {
    constructor() {
        this.rebalanceHistory = [];
        this.loadGapThreshold = 20;
    }

    analyzeClusterLoad() {
        const failures = new Set(
            FailureDetector.listFailures().map(failure => failure.nodeId)
        );

        return NodeManager
            .listNodes()
            .filter(node => node.status === "ACTIVE")
            .filter(node => !failures.has(node.id))
            .map(node => ({
                nodeId: node.id,
                load: Number.isFinite(node.load) ? node.load : 0,
                capacity: Number.isFinite(node.capacity) ? node.capacity : 100,
                available: Math.max(
                    0,
                    (Number.isFinite(node.capacity) ? node.capacity : 100) -
                    (Number.isFinite(node.load) ? node.load : 0)
                )
            }))
            .sort((a, b) => {
                if (b.load !== a.load) return b.load - a.load;
                return a.nodeId.localeCompare(b.nodeId);
            });
    }

    createPlan() {
        const nodes = this.analyzeClusterLoad();

        if (nodes.length < 2) {
            return {
                required: false,
                reason: "INSUFFICIENT_ACTIVE_NODES",
                actions: []
            };
        }

        const mostLoaded = nodes[0];
        const leastLoaded = nodes[nodes.length - 1];

        const loadGap = mostLoaded.load - leastLoaded.load;

        if (loadGap < this.loadGapThreshold) {
            return {
                required: false,
                reason: "LOAD_WITHIN_THRESHOLD",
                actions: []
            };
        }

        const transferableLoad = Math.floor(loadGap / 2);

        const action = {
            fromNodeId: mostLoaded.nodeId,
            toNodeId: leastLoaded.nodeId,
            loadUnits: transferableLoad,
            reason: "LOAD_REBALANCE",
            timestamp: Date.now()
        };

        return {
            required: true,
            reason: "LOAD_IMBALANCE",
            actions: [action]
        };
    }

    rebalance() {
        const plan = this.createPlan();

        if (!plan.required) {
            EventBus.emit("cluster_rebalance:not_required", {
                reason: plan.reason,
                timestamp: Date.now()
            });

            return plan;
        }

        this.rebalanceHistory.push(plan);

        EventBus.emit("cluster_rebalance:planned", {
            actions: plan.actions,
            timestamp: Date.now()
        });

        return plan;
    }

    snapshot() {
        return {
            historyCount: this.rebalanceHistory.length,
            lastPlan: this.rebalanceHistory[this.rebalanceHistory.length - 1] || null
        };
    }
}

module.exports = new ClusterRebalancer();
