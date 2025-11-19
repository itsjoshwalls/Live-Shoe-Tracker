import { PubSub } from "@google-cloud/pubsub";
import * as functions from "firebase-functions";

let pubsub;
function getPubSub() {
  if (!pubsub) pubsub = new PubSub();
  return pubsub;
}

function getTopicName() {
  return process.env.PUBSUB_TOPIC || "sneaker-analytics-events";
}

export async function publishEvent(type, payload) {
  const topicName = getTopicName();
  const client = getPubSub();
  try {
    // Ensure topic exists (best-effort create)
    const [topics] = await client.getTopics();
    const exists = topics.some((t) => t.name.endsWith(`/topics/${topicName}`));
    if (!exists) {
      await client.createTopic(topicName).catch(() => {});
    }
    const message = { type, payload, ts: new Date().toISOString() };
    const dataBuffer = Buffer.from(JSON.stringify(message));
    await client.topic(topicName).publishMessage({ data: dataBuffer });
    functions.logger.info(`📤 Published event ${type} to ${topicName}`);
  } catch (err) {
    functions.logger.error("Failed to publish event", { type, err });
  }
}
