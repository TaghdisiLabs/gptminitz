const EventBus = require("../events/event_bus");
const StateEngine = require("./state_engine");

class RecoveryJournal {
    constructor() {
        this.journal = [];
        this.checkpoints = new Map();
    }

    log(eventType, payload) {
        if (!eventType) {
            throw new Error("[RECOVERY_JOURNAL] Missing eventType");
        }

        const entry = {
            id: this.generateId(),
            eventType,
            payload,
            timestamp: Date.now()
        };

        this.journal.push(entry);

        if (this.journal.length > 50000) {
            this.journal.shift();
        }

        EventBus.emit("journal:log", entry);

        return entry;
    }

    checkpoint(name) {
        if (!name) {
            throw new Error("[RECOVERY_JOURNAL] Missing checkpoint name");
        }

        const snapshot = StateEngine.snapshot();

        const cp = {
            name,
            snapshot,
            timestamp: Date.now()
        };

        this.checkpoints.set(name, cp);

        EventBus.emit("journal:checkpoint_created", cp);

        return cp;
    }

    restoreCheckpoint(name) {
        const cp = this.checkpoints.get(name);

        if (!cp) {
            throw new Error("[RECOVERY_JOURNAL] Checkpoint not found");
        }

        EventBus.emit("journal:restore", {
            name,
            timestamp: Date.now()
        });

        return cp.snapshot;
    }

    getLogs(limit = 100) {
        return this.journal.slice(-limit);
    }

    generateId() {
        return `log_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    }

    snapshot() {
        return {
            journalSize: this.journal.length,
            checkpoints: Array.from(this.checkpoints.keys())
        };
    }
}

module.exports = new RecoveryJournal();