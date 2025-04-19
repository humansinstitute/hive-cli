// The purpose of agents is to setup the standard call parameters for a call to out backends.
// Each specific named agent will have a specific setup for the model and system prompts and
// Other parameters the will be set at run time. Response details will be logged in mongo
// and referenced by the callID set in the guid below. 

async function artefactAgent(message, context, history, artefactsObject) { //FILL IN VARIABLES
    const { v4: uuidv4 } = require('uuid');
    // Convert history array to a formatted string
    const historyString = history.map(entry =>
        `${entry.role.toUpperCase()}: ${entry.content}`
    ).join('\n\n');

    // artefactsObject inclludes three key varioables for fact extraction
    // artefactsObject.artefactFrame -> The template of the artefact type we're trying to gather details on
    // artefactsObject.artefactInitial -> The start point prior to the conversation
    // artefactsObject.artefact -> The latest version of the artefact.

    console.log(`We are inside the artefactAgent\n\nTHE FRAME IS:\n\n${JSON.stringify(artefactsObject.artefactFrame)}\n\nTHE CURRENT IS:\n\n${JSON.stringify(artefactsObject.artefact)}\n\nTHE MESSAGE HISTORY IS:\n\n${message}\n${historyString}`);

    const systemPromptInput = `Please review this conversation history and output a JSON object with the following fields:

    JSON OBJECT
    ${JSON.stringify(artefactsObject.artefactFrame)}

    *******
    The current facts you know right now are:
    ${JSON.stringify(artefactsObject.artefact)}
    *******

    Please review the conversation and update with additional facts. Do not remove interesting facts from earlier in the conversation but build upon them. Goals and other elements can be refined over time.

    HERE IS THE MESSAGE HISTORY OF THIS CONVERSATION:
    Last Message: ${message} 
    Message History: ${historyString}
        
    ONLY REPLY WITH THE JSON OBJECT AND WITH NO OTHER CHARACTERS OR TEXT.`;

    const callDetails = {
        callID: uuidv4(),
        model: {
            provider: "openai", // *** SET THIS FOR AN AGENT - will tell call which SDK client to pick.  
            model: "gpt-4o-mini", // // *** SET THIS FOR AN AGENT "gpt-4o" default model can be overridden at run tiem. 
            // provider: "groq", // *** SET THIS FOR AN AGENT - will tell call which SDK client to pick.  
            // model: "meta-llama/llama-4-scout-17b-16e-instruct", // // *** SET THIS FOR AN AGENT "gpt-4o" default model can be overridden at run time. 
            callType: 'This is a chat Call', // *** SET THIS FOR AN AGENT
            type: "json_object",
            temperature: 0.8, // *** SET THIS FOR AN AGENT
        },
        chat: {  // *** THIS IS SET ON THE FLY per CHAT - except for system input
            userPrompt: message,
            systemPrompt: systemPromptInput, // *** SET THIS FOR AN AGENT
            messageContext: context,
            messageHistory: [],
        },
        origin: { // *** THIS IS SET ON THE FLY per CHAT and tells us where the call came from and updates billing info
            productID: "tldr",
            customerID: "OS-Test",
            channelID: "OtherstuffStudio", //can change per instance of a caht bot
            conversationID: "conversation-ID",
            billingID: "OS-Test", // Represents the billing identity - currently slack team will be abstracted
        }
    };

    // console.log(callDetails);
    return callDetails;
}
module.exports = artefactAgent;