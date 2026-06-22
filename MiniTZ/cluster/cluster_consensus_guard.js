const EventBus = require("../events/event_bus");
const NodeManager = require("./node_manager");

class ClusterConsensusGuard {
    constructor() {
        this.term = 0;
        this.leaderNodeId = null;
        this.taskLocks = new Map();
        this.frozen = false;
        this.freezeReason = null;
        this.lockSequence = 0;
    }

    getEligibleLeaderNodes() {
        return NodeManager
            .listNodes()
            .filter(node => node.status === "ACTIVE")
            .sort((a, b) => a.id.localeCompare(b.id));
    }

    getQuorumNodes() {
        return NodeManager
            .listNodes()
            .filter(node =>
                node.status === "ACTIVE" ||
                node.status === "DEGRADED"
            )
            .sort((a, b) => a.id.localeCompare(b.id));
    }

    getClusterSize() {
        return NodeManager.listNodes().length;
    }

    getRequiredQuorum() {
        const total = this.getClusterSize();

        if (total === 0) {
            return 0;
        }

        return Math.floor(total / 2) + 1;
    }

    hasQuorum() {
        return this.getQuorumNodes().length >= this.getRequiredQuorum();
    }

    electLeader() {
        if (this.frozen) {
            throw new Error(`[CONSENSUS_GUARD] Cluster frozen: ${this.freezeReason}`);
        }

        if (!this.hasQuorum()) {
            throw new Error("[CONSENSUS_GUARD] Cannot elect leader without quorum");
        }

        const eligibleNodes = this.getEligibleLeaderNodes();

        if (eligibleNodes.length === 0) {
            throw new Error("[CONSENSUS_GUARD] No active node available for leadership");
        }

        const selectedLeader = eligibleNodes[0].id;

        if (this.leaderNodeId !== selectedLeader) {
            this.term += 1;
            this.leaderNodeId = selectedLeader;

            EventBus.emit("consensus:leader_elected", {
                leaderNodeId: this.leaderNodeId,
                term: this.term,
                timestamp: Date.now()
            });
        }

        return {
            leaderNodeId: this.leaderNodeId,
            term: this.term
        };
    }

    getLeader() {
        if (!this.leaderNodeId) {
            return this.electLeader().leaderNodeId;
        }

        const node = NodeManager.getNode(this.leaderNodeId);

        if (!node || node.status !== "ACTIVE") {
            return this.electLeader().leaderNodeId;
        }

        return this.leaderNodeId;
    }

    assertLeader(nodeId) {
        if (this.frozen) {
            throw new Error(`[CONSENSUS_GUARD] Cluster frozen: ${this.freezeReason}`);
        }

        return this.assertLeaderIdentity(nodeId);
    }

    assertLeaderIdentity(nodeId) {
        if (!nodeId) {
            throw new Error("[CONSENSUS_GUARD] Missing nodeId");
        }

        const leader = this.getLeader();

        if (leader !== nodeId) {
            throw new Error("[CONSENSUS_GUARD] Node is not the current leader");
        }

        return true;
    }

    acquireTaskLock(taskId, nodeId, ttlMs = 60000) {
        if (!taskId || !nodeId) {
            throw new Error("[CONSENSUS_GUARD] Missing taskId or nodeId");
        }

        if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
            throw new Error("[CONSENSUS_GUARD] Invalid lock ttlMs");
        }

        this.assertLeader(nodeId);

        if (!this.hasQuorum()) {
            throw new Error("[CONSENSUS_GUARD] Quorum not available");
        }

        const now = Date.now();
        const existing = this.taskLocks.get(taskId);

        if (existing && existing.expiresAt > now && existing.status === "ACTIVE") {
            throw new Error("[CONSENSUS_GUARD] Task already has an active lock");
        }

        this.lockSequence += 1;

        const lock = {
            taskId,
            ownerNodeId: nodeId,
            term: this.term,
            lockSequence: this.lockSequence,
            status: "ACTIVE",
            createdAt: now,
            expiresAt: now + ttlMs
        };

        this.taskLocks.set(taskId, lock);

        EventBus.emit("consensus:task_lock_acquired", {
            taskId,
            ownerNodeId: nodeId,
            term: this.term,
            lockSequence: this.lockSequence,
            timestamp: now
        });

        return lock;
    }

    validateTaskLock(taskId, nodeId) {
        if (this.frozen) {
            return {
                valid: false,
                reason: "CLUSTER_FROZEN",
                freezeReason: this.freezeReason
            };
        }

        const lock = this.taskLocks.get(taskId);

        if (!lock) {
            return {
                valid: false,
                reason: "LOCK_NOT_FOUND"
            };
        }

        if (lock.status !== "ACTIVE") {
            return {
                valid: false,
                reason: "LOCK_NOT_ACTIVE"
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
                reason: "STALE_CONSENSUS_TERM"
            };
        }

        if (Date.now() > lock.expiresAt) {
            this.taskLocks.delete(taskId);

            EventBus.emit("consensus:task_lock_expired", {
                taskId,
                ownerNodeId: nodeId,
                timestamp: Date.now()
            });

            return {
                valid: false,
                reason: "LOCK_EXPIRED"
            };
        }

        return {
            valid: true,
            reason: "LOCK_VALID",
            lock
        };
    }

    releaseTaskLock(taskId, nodeId) {
        if (!taskId || !nodeId) {
            throw new Error("[CONSENSUS_GUARD] Missing taskId or nodeId");
        }

        const lock = this.taskLocks.get(taskId);

        if (!lock) {
            return false;
        }

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

    expireLocks() {
        const now = Date.now();
        const expired = [];

        for (const [taskId, lock] of this.taskLocks.entries()) {
            if (lock.expiresAt <= now) {
                this.taskLocks.delete(taskId);
                expired.push(taskId);
            }
        }

        if (expired.length > 0) {
            EventBus.emit("consensus:locks_expired", {
                taskIds: expired,
                timestamp: now
            });
        }

        return expired;
    }

    detectSplitBrain(reports) {
        if (!Array.isArray(reports)) {
            throw new Error("[CONSENSUS_GUARD] Reports must be an array");
        }

        const leadersByTerm = new Map();

        for (const report of reports) {
            if (!report || !report.term || !report.leaderNodeId) {
                continue;
            }

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
                    leaders: Array.from(leaders).sort(),
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

        return {
            frozen: this.frozen,
            reason: this.freezeReason
        };
    }

    unfreeze(nodeId) {
        this.assertLeaderIdentity(nodeId);

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
            quorum: {
                available: this.hasQuorum(),
                required: this.getRequiredQuorum(),
                present: this.getQuorumNodes().length
            },
            activeLocks: Array.from(this.taskLocks.values())
                .sort((a, b) => a.taskId.localeCompare(b.taskId))
        };
    }
}

module.exports = new ClusterConsensusGuard();
