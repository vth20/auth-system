import RabbitMQ from "../index";
export * from "./email.producer";

/**
 * Publishes a message to a specified RabbitMQ queue.
 *
 * This function ensures the queue exists, serializes the message into a JSON string,
 * and publishes it to the specified queue with persistence enabled.
 *
 * @param queueName - The name of the RabbitMQ queue to publish the message to.
 * @param message - The message to be published. This should be an object.
 *
 * @throws Will throw an error if the RabbitMQ channel cannot be obtained or
 *         if publishing the message fails.
 */
const publishMessage = async (queueName: string, message: object) => {
  try {
    const channel = await RabbitMQ.getChannel();

    // Ensure the queue exists
    await channel.assertQueue(queueName, { durable: true });

    // Serialize the message if it's an object
    const messageContent = JSON.stringify(message);

    // Publish the message
    channel.sendToQueue(queueName, Buffer.from(messageContent), {
      persistent: true,
    });

    console.log(`Message published to queue "${queueName}":`, messageContent);
  } catch (error) {
    console.error("Failed to publish message:", error);
    throw error;
  }
};

export default publishMessage;
