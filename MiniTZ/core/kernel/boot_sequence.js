const fs = require("fs");
const path = require("path");

class BootSequence {
    constructor() {
        this.requiredFiles = [
            "core/kernel/runtime.js",
            "core/kernel/scheduler.js",
            "core/kernel/resource_manager.js",
            "core/ai/orchestrator.js",
            "core/execution/execution_engine.js",
            "core/memory/state_engine.js",
            "core/events/event_bus.js"
        ];
    }

    // MAIN ENTRY
    async execute() {
        this.validateNodeEnvironment();
        this.validateFileStructure();
        this.validateSystemIntegrity();

        return {
            status: "BOOT_OK",
            timestamp: Date.now()
        };
    }

    // 1. NODE CHECK
    validateNodeEnvironment() {
        const version = process.versions.node.split(".")[0];

        if (parseInt(version) < 18) {
            throw new Error("[BOOT] Node.js >= 18 required");
        }
    }

    // 2. FILE STRUCTURE CHECK
    validateFileStructure() {
        for (const file of this.requiredFiles) {
            const fullPath = path.resolve(process.cwd(), file);

            if (!fs.existsSync(fullPath)) {
                throw new Error(`[BOOT] Missing required file: ${file}`);
            }
        }
    }

    // 3. SYSTEM INTEGRITY CHECK
    validateSystemIntegrity() {
        const criticalFolders = [
            "core",
            "core/kernel",
            "core/ai",
            "core/execution",
            "core/memory",
            "core/events"
        ];

        for (const folder of criticalFolders) {
            const fullPath = path.resolve(process.cwd(), folder);

            if (!fs.existsSync(fullPath)) {
                throw new Error(`[BOOT] Missing critical folder: ${folder}`);
            }
        }
    }
}

module.exports = new BootSequence();