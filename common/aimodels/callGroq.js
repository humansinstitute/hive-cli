const axios = require('axios');
require("dotenv").config({ path: `${__dirname}/.env` });
const Groq = require('groq-sdk');


// Define the function to prepare the message history
function prepareMessageHistory(messageHistory, systemPrompt, userPrompt, messageContext) {
    // Combine system prompt, message history, and user prompt
    const messages = [{ role: "system", content: systemPrompt }];

    if (Array.isArray(messageHistory) && messageHistory.length > 0) {
        messages.push(...messageHistory);

        // Check if the last message in the history is the same as userPrompt
        const lastMessage = messageHistory[messageHistory.length - 1];
        if (lastMessage.role === 'user' && lastMessage.content === userPrompt) {
            return messages; // Skip adding the userPrompt if it's the same as the last message
        }
    };

    // Add message context if the length is greater than 5 chars (i.e. non default).
    if (messageContext && messageContext.length > 5) {
        messages.push({ role: "assistant", content: messageContext });
    }

    // Add user prompt as the last message
    messages.push({ role: "user", content: userPrompt });

    // console.log("THIS IS THE MESSAGE HISTORY OBJECT: ", messages);
    return messages;
}

async function callGroq(callDetails) {

    // Initialize the Groq client
    const groq = new Groq({ apiKey: process.env.GROQ_API });
    console.log("Groq API", process.env.GROQ_API);
    // Then creates a version with the langfuse observers added
    try {
        console.log("Sending call ", callDetails.model.callType);
        const response = await groq.chat.completions.create({
            messages: prepareMessageHistory(callDetails.chat.messageHistory, callDetails.chat.systemPrompt, callDetails.chat.userPrompt, callDetails.chat.messageContext),
            model: callDetails.model.model,
        });

        console.log("I got a repsonse!\n", response);

        const extractResponse = response.choices[0].message.content.trim();
        const objectResponse = {
            callID: callDetails.callID,
            // billingID: callDetails.origin.billingID,
            message: extractResponse,
            // usage: usage
        }
        // console.log("Chat Response: ", objectResponse);
        // await updateAccount(objectResponse);
        console.log("I'm about to return this object From Groq\n", objectResponse);
        return objectResponse;
    } catch (error) {
        return `An error occurred: ${error.message}`;
    }
}
module.exports = callGroq;