// The purpose of agents is to setup the standard call parameters for a call to out backends.
// Each specific named agent will have a specific setup for the model and system prompts and
// Other parameters the will be set at run time. Response details will be logged in mongo
// and referenced by the callID set in the guid below. 

async function factBot(message, context, history, facts) { //FILL IN VARIABLES
    const { v4: uuidv4 } = require('uuid');
    // Convert history array to a formatted string
    const historyString = history.map(entry =>
        `${entry.role.toUpperCase()}: ${entry.content}`
    ).join('\n\n');

    const systemPromptInput = `Please review this message history and output a JSON object with the following fields:

    JSON OBJECT
    {
        "Name": "What is the name of this user",
        "Email": "What is the email of this user",
        "Budget": "What is the budget of this user",
        "Timeframe": "What timeframe are they looking to buy appliances",
        "applianceType": "What type of appliances are they looking to buy",
        "status": "What is the status of the user in their applicance journey",
        "goal": "What is the goal of the user",
        "InterestingFacts": ["any interesting or remarked facts about the user","or about their circumstance that would be useful in sales"]
    }

    *******
    The current facts you know right now are:
    ${facts}
    *******

    Please review the conversation and updates with additional facts. For instance, you shouldn't remove interesting facts from earlier in the conversation but build them up. Where as goals etc can be refined over time. 

    HERE IS THE HISTORY OF THIS CONVERATION:
    ${historyString}
    
    ONLY REPLY WITH THE JSON OBJECT AND WITH NO OTHER CHARACTERS OR TEXT.`;

    const callDetails = {
        callID: uuidv4(),
        model: {
            provider: "openai", // *** SET THIS FOR AN AGENT - will tell call which SDK client to pick.  
            model: "gpt-4o-mini", // // *** SET THIS FOR AN AGENT "gpt-4o" default model can be overridden at run tiem. 
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
module.exports = factBot;