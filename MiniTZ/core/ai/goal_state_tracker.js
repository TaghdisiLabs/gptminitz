const EventBus = require("../events/event_bus");

class GoalStateTracker {
    constructor() {
        this.goals = new Map();
    }

    createGoal(goalId, data) {
        if (!goalId) {
            throw new Error("[GOAL_TRACKER] Missing goalId");
        }

        const goal = {
            goalId,
            data,
            status: "ACTIVE",
            progress: 0,
            steps: [],
            createdAt: Date.now()
        };

        this.goals.set(goalId, goal);

        EventBus.emit("goal:created", {
            goalId,
            timestamp: Date.now()
        });

        return goal;
    }

    updateProgress(goalId, progress) {
        const goal = this.goals.get(goalId);

        if (!goal) {
            throw new Error("[GOAL_TRACKER] Goal not found");
        }

        goal.progress = Math.max(0, Math.min(1, progress));

        if (goal.progress === 1) {
            goal.status = "COMPLETED";
        }

        EventBus.emit("goal:progress", {
            goalId,
            progress: goal.progress
        });

        return goal;
    }

    addStep(goalId, step) {
        const goal = this.goals.get(goalId);

        if (!goal) {
            throw new Error("[GOAL_TRACKER] Goal not found");
        }

        goal.steps.push({
            step,
            timestamp: Date.now()
        });

        EventBus.emit("goal:step_added", {
            goalId,
            step
        });

        return goal;
    }

    get(goalId) {
        return this.goals.get(goalId) || null;
    }

    snapshot() {
        return Object.fromEntries(this.goals);
    }
}

module.exports = new GoalStateTracker();