const EventBus = require("../events/event_bus");

class VLLMConnector {
    constructor() {
        this.endpoint = process.env.VLLM_ENDPOINT || "http://localhost:8000";
        this.model = process.env.VLLM_MODEL || "default-model";
    }

    async generate(prompt, options = {}) {
        if (!prompt) {
            throw new Error("[VLLM] Missing prompt");
        }

        const payload = {
            model: this.model,
            prompt,
            temperature: options.temperature || 0.7,
            max_tokens: options.max_tokens || 512
        };

        EventBus.emit("vllm:request_sent", {
            model: this.model,
            timestamp: Date.now()
        });

        try {
            const response = await this.fakeRequest(payload);

            EventBus.emit("vllm:response_received", {
                model: this.model
            });

            return response;

        } catch (err) {
            EventBus.emit("vllm:error", {
                error: err.message
            });

            throw err;
        }
    }

    // placeholder for real HTTP call
    async fakeRequest(payload) {
        return {
            text: `SIMULATED_RESPONSE_FOR: ${payload.prompt}`,
            model: payload.model,
            usage: {
                tokens: payload.prompt.length
            }
        };
    }

    snapshot() {
        return {
            endpoint: this.endpoint,
            model: this.model
        };
    }
}

module.exports = new VLLMConnector();