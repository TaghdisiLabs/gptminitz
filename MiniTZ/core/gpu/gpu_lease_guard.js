const EventBus = require("../events/event_bus");
const GPUManager = require("./gpu_manager");

class GPULeaseGuard {
    constructor() {
        this.leases = new Map();
        this.leaseTimeoutMs = 60000; // 1 min default safety lease
    }

    createLease(taskId, gpuId) {
        if (!taskId || !gpuId) {
            throw new Error("[GPU_LEASE_GUARD] Missing taskId or gpuId");
        }

        const lease = {
            taskId,
            gpuId,
            createdAt: Date.now(),
            expiresAt: Date.now() + this.leaseTimeoutMs,
            status: "ACTIVE"
        };

        this.leases.set(taskId, lease);

        EventBus.emit("gpu:lease_created", lease);

        return lease;
    }

    validateLease(taskId) {
        const lease = this.leases.get(taskId);

        if (!lease) {
            return false;
        }

        const now = Date.now();

        if (now > lease.expiresAt) {
            lease.status = "EXPIRED";

            EventBus.emit("gpu:lease_expired", {
                taskId,
                gpuId: lease.gpuId
            });

            GPUManager.release(taskId);
            this.leases.delete(taskId);

            return false;
        }

        return true;
    }

    renewLease(taskId) {
        const lease = this.leases.get(taskId);

        if (!lease) {
            throw new Error("[GPU_LEASE_GUARD] Lease not found");
        }

        lease.expiresAt = Date.now() + this.leaseTimeoutMs;

        EventBus.emit("gpu:lease_renewed", {
            taskId,
            gpuId: lease.gpuId
        });

        return lease;
    }

    revokeLease(taskId) {
        const lease = this.leases.get(taskId);

        if (!lease) return false;

        lease.status = "REVOKED";

        GPUManager.release(taskId);

        this.leases.delete(taskId);

        EventBus.emit("gpu:lease_revoked", {
            taskId,
            gpuId: lease.gpuId
        });

        return true;
    }

    snapshot() {
        return {
            activeLeases: this.leases.size
        };
    }
}

module.exports = new GPULeaseGuard();