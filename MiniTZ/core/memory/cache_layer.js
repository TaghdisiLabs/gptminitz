const EventBus = require("../events/event_bus");

class CacheLayer {
    constructor() {
        this.cache = new Map();
        this.ttlIndex = new Map();
    }

    set(key, value, ttl = 60000) {
        if (!key) {
            throw new Error("[CACHE_LAYER] Missing key");
        }

        const expiresAt = Date.now() + ttl;

        this.cache.set(key, {
            value,
            createdAt: Date.now(),
            expiresAt
        });

        this.ttlIndex.set(key, expiresAt);

        EventBus.emit("cache:set", {
            key,
            ttl,
            timestamp: Date.now()
        });

        return true;
    }

    get(key) {
        const entry = this.cache.get(key);

        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.ttlIndex.delete(key);
            return null;
        }

        return entry.value;
    }

    delete(key) {
        const exists = this.cache.has(key);

        if (!exists) return false;

        this.cache.delete(key);
        this.ttlIndex.delete(key);

        EventBus.emit("cache:delete", {
            key,
            timestamp: Date.now()
        });

        return true;
    }

    clear() {
        this.cache.clear();
        this.ttlIndex.clear();

        EventBus.emit("cache:clear", {
            timestamp: Date.now()
        });
    }

    size() {
        return this.cache.size;
    }

    snapshot() {
        const result = {};

        for (const [key, value] of this.cache.entries()) {
            result[key] = value;
        }

        return result;
    }
}

module.exports = new CacheLayer();