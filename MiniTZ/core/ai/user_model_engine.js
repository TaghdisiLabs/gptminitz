const EventBus = require("../events/event_bus");
const ContextStore = require("../memory/context_store");

class UserModelEngine {
    constructor() {
        this.users = new Map();
    }

    init(userId) {
        if (!userId) {
            throw new Error("[USER_MODEL] Missing userId");
        }

        if (!this.users.has(userId)) {
            const profile = {
                userId,
                preferences: {},
                history: [],
                behaviorScore: 0,
                createdAt: Date.now()
            };

            this.users.set(userId, profile);
            ContextStore.set(`user:${userId}`, profile);

            EventBus.emit("user:init", { userId });
        }

        return this.users.get(userId);
    }

    setPreference(userId, key, value) {
        const user = this.init(userId);

        user.preferences[key] = value;

        EventBus.emit("user:preference_updated", {
            userId,
            key,
            value
        });

        return user;
    }

    addInteraction(userId, interaction) {
        const user = this.init(userId);

        user.history.push({
            interaction,
            timestamp: Date.now()
        });

        if (user.history.length > 1000) {
            user.history.shift();
        }

        EventBus.emit("user:interaction_added", { userId });

        return user;
    }

    computeBehaviorScore(userId) {
        const user = this.users.get(userId);
        if (!user) return 0;

        const score = Math.min(1, user.history.length / 100);

        user.behaviorScore = score;

        return score;
    }

    get(userId) {
        return this.users.get(userId) || null;
    }

    snapshot() {
        return Object.fromEntries(this.users);
    }
}

module.exports = new UserModelEngine();