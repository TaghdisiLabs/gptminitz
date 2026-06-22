const EventBus = require("../events/event_bus");
const TaskRouter = require("./task_router");

class JobQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.maxConcurrency = 1;
    }

    add(job) {
        if (!job || !job.id) {
            throw new Error("[JOB_QUEUE] Invalid job");
        }

        this.queue.push({
            ...job,
            status: "QUEUED",
            createdAt: Date.now()
        });

        EventBus.emit("job:queued", {
            jobId: job.id
        });

        this.process();

        return job;
    }

    async process() {
        if (this.processing) return;

        this.processing = true;

        EventBus.emit("job:processing_started", {
            timestamp: Date.now()
        });

        while (this.queue.length > 0) {
            const job = this.queue.shift();

            try {
                job.status = "RUNNING";

                EventBus.emit("job:started", {
                    jobId: job.id
                });

                const result = await TaskRouter.route(job);

                job.status = "COMPLETED";
                job.result = result;
                job.completedAt = Date.now();

                EventBus.emit("job:completed", {
                    jobId: job.id
                });

            } catch (err) {
                job.status = "FAILED";
                job.error = err.message;

                EventBus.emit("job:failed", {
                    jobId: job.id,
                    error: err.message
                });
            }
        }

        this.processing = false;

        EventBus.emit("job:processing_finished", {
            timestamp: Date.now()
        });
    }

    size() {
        return this.queue.length;
    }

    snapshot() {
        return {
            queueSize: this.queue.length,
            processing: this.processing
        };
    }
}

module.exports = new JobQueue();