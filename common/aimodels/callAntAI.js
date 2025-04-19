/**
 * This module handles communication with the Anthropic Claude AI API.
 * It manages message history preparation, cost calculation, and API calls.
 */

const axios = require('axios');
require("dotenv").config({ path: `${__dirname}/.env` });

const Anthropic = require('@anthropic-ai/sdk').default;

/**
 * Prepares and formats the message history for the AI conversation.
 * This function ensures proper message flow and context management.
 * 
 * @param {Array} messageHistory - Previous conversation messages
 * @param {string} userPrompt - Current user input
 * @param {string} messageContext - Additional context for the conversation
 * @returns {Array} Formatted array of messages ready for API consumption
 */
function prepareMessageHistory(messageHistory, userPrompt, messageContext) {
    let messages = [];

    // Process message history
    if (Array.isArray(messageHistory) && messageHistory.length > 0) {
        for (let i = 0; i < messageHistory.length; i++) {
            if (i === 0 || messageHistory[i].role !== messageHistory[i - 1].role) {
                messages.push(messageHistory[i]);
            } else {
                // Merge consecutive messages of the same role
                messages[messages.length - 1].content += "\n\n" + messageHistory[i].content;
            }
        }
    }

    // Ensure alternating roles
    for (let i = 0; i < messages.length - 1; i++) {
        if (messages[i].role === messages[i + 1].role) {
            messages.splice(i + 1, 0, {
                role: messages[i].role === 'user' ? 'assistant' : 'user',
                content: 'Understood. Please continue.'
            });
        }
    }

    // Add message context if it exists
    if (messageContext && messageContext.length > 0) {
        if (messages.length === 0 || messages[messages.length - 1].role === 'assistant') {
            messages.push({ role: 'user', content: messageContext });
        } else {
            messages.push({ role: 'assistant', content: 'I understand. Please provide more information.' });
            messages.push({ role: 'user', content: messageContext });
        }
    }

    // Add final user prompt
    if (userPrompt && userPrompt.length > 0) {
        if (messages.length === 0 || messages[messages.length - 1].role === 'assistant') {
            messages.push({ role: 'user', content: userPrompt });
        } else {
            messages.push({ role: 'assistant', content: 'I see. What else can I help you with?' });
            messages.push({ role: 'user', content: userPrompt });
        }
    }

    return messages;
}

/**
 * Calculates the cost of using the Claude AI model based on token usage.
 * This helps track and manage API usage costs.
 * 
 * @param {Object} usage - Object containing token usage information
 * @returns {Object} Cost breakdown including input, output, and total costs
 * @throws {Error} If the model is not supported
 */
function calculateLLMCost(usage) {
    const inputCostPerMillion = 3.00; // USD cost per 1 Million input tokens
    const outputCostPerMillion = 15.00; // USD cost per 1 Million output tokens

    // Check if the model includes "gpt-4o"
    if (!usage.model.includes("claude-3-5-sonnet")) {
        throw new Error("Model does not include 'claude-3-5-sonnet'");
    }

    // Calculate costs
    const inputTokens = usage.input_tokens;
    const outputTokens = usage.output_tokens;

    const inputCost = (inputTokens / 1000000) * inputCostPerMillion;
    const outputCost = (outputTokens / 1000000) * outputCostPerMillion;

    const totalCost = inputCost + outputCost;

    return { input: inputCost, output: outputCost, total: totalCost };
}

/**
 * Main function to interact with the Anthropic Claude AI API.
 * Handles the complete lifecycle of an AI conversation request.
 * 
 * @param {Object} callDetails - Object containing:
 *   - chat: Message history, user prompt, and system prompt
 *   - model: Model configuration (name, temperature)
 *   - callID: Unique identifier for the call
 *   - origin: Billing information
 * @returns {Object} Response containing:
 *   - callID: Original call identifier
 *   - billingID: Billing identifier
 *   - message: AI response text
 *   - usage: Token usage and cost information
 */
async function callAntAI(callDetails) {

    // Initialize the Anthropic client
    const anthropic = new Anthropic({ apiKey: process.env.ANT_API });
    const messages = await prepareMessageHistory(callDetails.chat.messageHistory, callDetails.chat.userPrompt, callDetails.chat.messageContext);

    console.log("***** THE MESSAGE ARRAY IS *****");
    console.log(messages);

    try {
        let responseText;
        const response = await anthropic.messages.create({
            messages: messages,
            system: callDetails.chat.systemPrompt,
            model: callDetails.model.model,
            max_tokens: 4096,
            temperature: callDetails.model.temperature,

        });

        const usage = response.usage;
        usage.model = callDetails.model.model;
        let costReturn;

        // CALCULATE THE DOLLAR COST
        try {
            costReturn = await calculateLLMCost(usage);
            // console.log(`Total cost: $${cost.toFixed(2)}`); // Outputs: Total cost: $1.25
        } catch (error) {
            console.error(error.message);
        }

        usage.costs = costReturn;
        console.log("USD Costs in Usage: ", usage.costs);

        // Extract the text content from the response
        responseText = response.content[0].text;
        // console.log(response);

        const objectResponse = {
            callID: callDetails.callID,
            billingID: callDetails.origin.billingID,
            message: responseText,
            usage: usage
        }

        return objectResponse;
    } catch (error) {
        const errorResponse = {
            callID: "error",
            billingID: "error",
            message: `An error occurred: ${error.message}`,
            usage: "error"
        }
        return errorResponse;
    }
};
module.exports = callAntAI;