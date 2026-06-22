const EventBus = require("../events/event_bus");
const FailureDetector = require("./failure_detector");
const NodeManager = require("./node_manager");

class SelfHealingEngine {
    constructor() {
        this.healingLog = [];
    }

    async evaluate(nodeId) {
        const status = FailureDetector.analyze(nodeId);

        if (status === "OK") {
            return { nodeId, action: "NONE" };
        }

        const node = NodeManager.listNodes().find(n => n.id === nodeId);

        if (!node) {
            return { nodeId, action: "REMOVE" };
        }

        const action = this.decideAction(nodeId, node);

        const result = await this.executeAction(nodeId, action);

        this.healingLog.push({
            nodeId,
            action,
            timestamp: Date.now()
        });

        EventBus.emit("self_healing:action_taken", {
            nodeId,
            action
        });

        return result;
    }

    decideAction(nodeId, node) {
        if (!node) return "REMOVE";

        if (node.status === "UNHEALTHY") {
            return "RESTART";
        }

        return "ISOLATE";
    }

    async executeAction(nodeId, action) {
        switch (action) {
            case "RESTART":
                EventBus.emit("self_healing:restart", { nodeId });
                return { nodeId, action };

            case "ISOLATE":
                EventBus.emit("self_healing:isolate", { nodeId });
                return { nodeId, action };

            case "REMOVE":
                NodeManager.removeNode(nodeId);
                return { nodeId, action };

            default:
                return { nodeId, action: "NONE" };
        }
    }

    snapshot() {
        return {
            healed: this.healingLog.length
        };
    }
}

module.exports = new SelfHealingEngine();