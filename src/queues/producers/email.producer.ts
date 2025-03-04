import config from "../../config";
import { QUEUE_NAME } from "../../config/queues";
import { IPayloadVerifyEmail } from "../../types";
import publishMessage from "./index";

/**
 * Publishes a message to the VERIFY_EMAIL queue. This function adds a verification link to the message payload and sends it to the specified queue.
 *
 * @async
 * @function publishMessageVerifyEmail
 * @param {IPayloadVerifyEmail} message - The payload containing the email verification details. It must include the `verificationToken`, `email`, and other required fields.
 *
 * @throws {Error} If there is an issue with publishing the message to the queue, the error is thrown.
 */
export const publishMessageVerifyEmail = async (
  message: IPayloadVerifyEmail
) => {
  try {
    const queue = QUEUE_NAME.VERIFY_EMAIL;
    const verificationLink = `${config.host}/v1/auth/verify-email?token=${message.verificationToken}`;
    await publishMessage(queue, { ...message, verificationLink });
  } catch (error) {
    throw error;
  }
};
