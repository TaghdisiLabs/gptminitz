const EventBus = require("../events/event_bus");
const NodeManager = require("./node_manager");

class ClusterConsensusGuard {
    constructor() {
        this.term = 0;
        this.leaderNodeId = null;
        this.taskLocks = new Map();
        this.frozen = false;
        this.freezeReason = null;
    }

    electLeader() {
        const nodes = NodeManager
            .listNodes()
            .filter(node => node.status === "ACTIVE");

        if (nodes.length === 0) {
            throw new Error("[CONSENSUS_GUARD] No active nodes available");
        }

        const leader = nodes
            .map(node => node.id)
            .sort()[0];

        this.term += 1;
        this.leaderNodeId = leader;

        EventBus.emit("consensus:leader_elected", {
            leaderNodeId: leader,
            term: this.term,
            timestamp: Date.now()
        });

        return {
            leaderNodeId: leader,
            term: this.term
        };
    }

    getLeader() {
        if (!this.leaderNodeId) {
            return this.electLeader().leaderNodeId;
        }

        return this.leaderNodeId;
    }

    assertLeader(nodeId) {
        if (this.frozen) {
            throw new Error(`[CONSENSUS_GUARD] Cluster frozen: ${this.freezeReason}`);
        }

        if (!nodeId) {
            throw new Error("[CONSENSUS_GUARD] Missing nodeId");
        }

        const leader = this.getLeader();

        if (leader !== nodeId) {
            throw new Error("[CONSENSUS_GUARD] Node is not leader");
        }

        return true;
    }

    acquireTaskLock(taskId, nodeId, ttlMs = 60000) {
        if (!taskId || !nodeId) {
            throw new Error("[CONSENSUS_GUARD] Missing taskId or nodeId");
        }

        this.assertLeader(nodeId);

        const existing = this.taskLocks.get(taskId);
        const now = Date.now();

        if (existing && existing.expiresAt > now) {
            throw new Error("[CONSENSUS_GUARD] Task already locked");
        }

        const lock = {
            taskId,
            ownerNodeId: nodeId,
            term: this.term,
            status: "ACTIVE",
            createdAt: now,
            expiresAt: now + ttlMs
        };

        this.taskLocks.set(taskId, lock);

        EventBus.emit("consensus:task_locked", {
            taskId,
            ownerNodeId: nodeId,
            term: this.term,
            timestamp: now
        });

        return lock;
    }

    validateTaskLock(taskId, nodeId) {
        const lock = this.taskLocks.get(taskId);

        if (!lock) {
            return {
                valid: false,
                reason: "LOCK_NOT_FOUND"
            };
        }

        if (lock.ownerNodeId !== nodeId) {
            return {
                valid: false,
                reason: "NODE_DOES_NOT_OWN_LOCK"
            };
        }

        if (lock.term !== this.term) {
            return {
                valid: false,
                reason: "STALE_TERM"
            };
        }

        if (Date.now() > lock.expiresAt) {
            this.taskLocks.delete(taskId);

            return {
                valid: false,
                reason: "LOCK_EXPIRED"
            };
        }

        return {
            valid: true,
            reason: "LOCK_VALID"
        };
    }

    releaseTaskLock(taskId, nodeId) {
        const lock = this.taskLocks.get(taskId);

        if (!lock) return false;

        if (lock.ownerNodeId !== nodeId && nodeId !== this.leaderNodeId) {
            throw new Error("[CONSENSUS_GUARD] Node cannot release this lock");
        }

        this.taskLocks.delete(taskId);

        EventBus.emit("consensus:task_lock_released", {
            taskId,
            nodeId,
            timestamp: Date.now()
        });

        return true;
    }

    detectSplitBrain(reports) {
        if (!Array.isArray(reports)) {
            throw new Error("[CONSENSUS_GUARD] Reports must be array");
        }

        const leadersByTerm = new Map();

        for (const report of reports) {
            if (!report || !report.term || !report.leaderNodeId) continue;

            if (!leadersByTerm.has(report.term)) {
                leadersByTerm.set(report.term, new Set());
            }

            leadersByTerm.get(report.term).add(report.leaderNodeId);
        }

        for (const [term, leaders] of leadersByTerm.entries()) {
            if (leaders.size > 1) {
                this.freeze(`SPLIT_BRAIN_TERM_${term}`);

                EventBus.emit("consensus:split_brain_detected", {
                    term,
                    leaders: Array.from(leaders),
                    timestamp: Date.now()
                });

                return true;
            }
        }

        return false;
    }

    freeze(reason) {
        this.frozen = true;
        this.freezeReason = reason || "CONSENSUS_FROZEN";

        EventBus.emit("consensus:frozen", {
            reason: this.freezeReason,
            timestamp: Date.now()
        });
    }

    unfreeze(nodeId) {
        this.assertLeader(nodeId);

        this.frozen = false;
        this.freezeReason = null;

        EventBus.emit("consensus:unfrozen", {
            nodeId,
            timestamp: Date.now()
        });

        return true;
    }

    snapshot() {
        return {
            term: this.term,
            leaderNodeId: this.leaderNodeId,
            frozen: this.frozen,
            freezeReason: this.freezeReason,
            activeLocks: this.taskLocks.size
        };
    }
}

module.exports = new ClusterConsensusGuard();
