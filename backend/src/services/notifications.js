import * as PushAPI from "@pushprotocol/restapi";
import { Wallet } from "ethers";

const PUSH_CHANNEL_PRIVATE_KEY = process.env.PUSH_CHANNEL_PRIVATE_KEY;
const PUSH_CHANNEL_ADDRESS = process.env.PUSH_CHANNEL_ADDRESS;

/**
 * Sends a Push Notification to a specific recipient.
 */
export const sendNotification = async (recipient, title, body) => {
    if (!PUSH_CHANNEL_PRIVATE_KEY || !PUSH_CHANNEL_ADDRESS) {
        console.warn("Push Protocol not configured. Skipping notification.");
        return;
    }

    try {
        const signer = new Wallet(PUSH_CHANNEL_PRIVATE_KEY);

        const apiResponse = await PushAPI.payloads.sendNotification({
            signer,
            type: 3, // Targetted notification
            identityType: 2, // Direct payload
            notification: {
                title,
                body
            },
            payload: {
                title,
                body,
                cta: '',
                img: ''
            },
            recipients: `eip155:11155111:${recipient}`, // Sepolia/Amoy eip155:chainId:address
            channel: `eip155:11155111:${PUSH_CHANNEL_ADDRESS}`,
            env: 'staging' // Use staging for testnets
        });

        console.log("Push Notification Sent:", apiResponse.status);
    } catch (error) {
        console.error("Error sending Push Notification:", error);
    }
};

/**
 * Sends a broadcast notification to all channel subscribers.
 */
export const broadcastNotification = async (title, body) => {
    if (!PUSH_CHANNEL_PRIVATE_KEY || !PUSH_CHANNEL_ADDRESS) return;

    try {
        const signer = new Wallet(PUSH_CHANNEL_PRIVATE_KEY);

        await PushAPI.payloads.sendNotification({
            signer,
            type: 1, // Broadcast
            identityType: 2,
            notification: { title, body },
            payload: { title, body, cta: '', img: '' },
            channel: `eip155:11155111:${PUSH_CHANNEL_ADDRESS}`,
            env: 'staging'
        });
    } catch (error) {
        console.error("Error broadcasting Push Notification:", error);
    }
};
