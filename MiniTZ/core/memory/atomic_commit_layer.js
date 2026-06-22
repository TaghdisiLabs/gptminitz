const EventBus = require("../events/event_bus");

class AtomicCommitLayer {
    constructor() {
        this.transactionLog = [];
        this.locked = false;
    }

    beginTransaction(id) {
        if (!id) {
            throw new Error("[ATOMIC_COMMIT] Missing transaction id");
        }

        if (this.locked) {
            throw new Error("[ATOMIC_COMMIT] System locked");
        }

        const tx = {
            id,
            status: "OPEN",
            operations: [],
            startedAt: Date.now()
        };

        this.transactionLog.push(tx);

        EventBus.emit("transaction:started", { id });

        return tx;
    }

    addOperation(txId, operation) {
        const tx = this.transactionLog.find(t => t.id === txId);

        if (!tx) {
            throw new Error("[ATOMIC_COMMIT] Transaction not found");
        }

        if (tx.status !== "OPEN") {
            throw new Error("[ATOMIC_COMMIT] Transaction not open");
        }

        tx.operations.push({
            ...operation,
            timestamp: Date.now()
        });

        EventBus.emit("transaction:operation_added", {
            txId,
            operation: operation.type
        });

        return tx;
    }

    commit(txId) {
        const tx = this.transactionLog.find(t => t.id === txId);

        if (!tx) {
            throw new Error("[ATOMIC_COMMIT] Transaction not found");
        }

        tx.status = "COMMITTED";
        tx.committedAt = Date.now();

        EventBus.emit("transaction:committed", {
            txId,
            timestamp: Date.now()
        });

        return tx;
    }

    rollback(txId) {
        const tx = this.transactionLog.find(t => t.id === txId);

        if (!tx) {
            throw new Error("[ATOMIC_COMMIT] Transaction not found");
        }

        tx.status = "ROLLED_BACK";
        tx.rolledBackAt = Date.now();

        EventBus.emit("transaction:rolled_back", {
            txId,
            timestamp: Date.now()
        });

        return tx;
    }

    lock() {
        this.locked = true;

        EventBus.emit("atomic_commit:locked", {
            timestamp: Date.now()
        });
    }

    unlock() {
        this.locked = false;

        EventBus.emit("atomic_commit:unlocked", {
            timestamp: Date.now()
        });
    }

    snapshot() {
        return {
            locked: this.locked,
            transactions: this.transactionLog
        };
    }
}

module.exports = new AtomicCommitLayer();