/**
 * HIVE CLI
 * 
 * This application will help you through a CLI wizard to define new features for your application. 
 */

// IMPORT REQUIRED AGENTS WE WILL USE FOR THIS TASK
const nextQuestionAgent = require('./agents/nextQuestionAgent');
const artefactAgent = require('./agents/artefactAgent');
const statusBot = require('./agents/statusBot'); // Import statusBot
const aiWrapper = require('./common/aimodels/aiWrapper'); // Used to Call different agents

const { v4: uuidv4 } = require('uuid');
require("dotenv").config({ path: `.env` });


// Object to store conversation history for each user when discussing a feature.
const conversationHistories = {};

/**
 * This is an AI chat processing function that coordinates the use of multiple AI agents to achieve a goal of updating differnte hive artefacts based on teh specific scope taht has been given. 
 
* Handles response generation, fact management and completion of the artefact.
 * The function follows a multi-stage AI processing pipeline:
 * 1. Artefact Management
 *    The Artefact Agent analyzes the conversation so far and keeps a most upto date version of an artefact given the conversation history, and previous state of the artefact.
 * 2. Next Question Agent
 *    Analyses teh current state of hte artefcat, the scope we're trying to acheive and plans the next best question to complete the artefact using:
 *    - The user's message
 *    - Retrieved context
 *    - Conversation history
 *    - Latest artefact version
 * 
 */
async function artefactBuilderFlow(message, userId) {

    let latestFacts = '{}';
    // Initialize latestFacts as an empty object string


    // TODO - NEEDS TO MAP TO A LOCAL FUNCTION NOT MONGO
    // const history = await retrieveConversationHistory(userId);

    let responseMessage;
    let scope = {};

    // Stage 1: Set Scope
    // Fire up a CLI interface that will figure out what updates I need to make to th product docuemntation. Acceptable scopes will include.
    // 1. Product Level Updates
    // 2. Feature Level updates
    // The output will be a scope object
    // {
    //   "scopelevel": "product | feature",
    //   "feature": "false | featureID"
    // }

    // Stage 2: Review for Updates
    // The factBot agent will take in analyse the conversation so far and establish what the updates need to be made to the project docuemntation. 

    if scope = null go back to the

    let currentFacts = // Should  return the facts form the appropriate scope for the 

    const factCheckAgent = await factBot(message, "", history, currentFactsForFactBot);
    const factObject = await aiWrapper(factCheckAgent);
    console.log("Fact Object: \n");
    console.log(factObject.facts);


    // Process and store the extracted facts
    if (factObject && factObject.message) {
        let facts = factObject.message;

        console.log("Just the facts.");
        console.log(facts.render.content);

        // Check if facts is already an object, if not, try to parse it
        if (typeof facts === 'string') {
            try {
                facts = JSON.parse(facts);
            } catch (error) {
                console.error('Error parsing fact object:', error);
                // Decide how to handle parsing error - maybe log and continue?
                // For now, we proceed without updating facts if parsing fails.
                facts = null;
            }
        }

        if (facts) { // Proceed only if facts is a valid object
            // Remove empty fields
            Object.keys(facts).forEach(key => {
                if (facts[key] === '' || (Array.isArray(facts[key]) && facts[key].length === 0)) {
                    delete facts[key];
                }
            });

            // Update or set the facts for this user
            userFacts.set(userId, JSON.stringify(facts));

            // Emit the cleaned facts object to the client
            io.to(userId).emit('fact update', facts);
        }


        // Stage 4: Brief Agent Response Generation (Moved from Stage 3)
        // The BriefAgent crafts an appropriate response using:
        // - The user's message
        // - Retrieved context
        // - Conversation history
        // - Latest known facts about the user (potentially updated by FactBot)
        const latestFactsForBriefAgent = userFacts.get(userId) || '{}'; // Get latest facts AFTER potential update
        const callDetailsChat = await briefAgent(message, context, history, latestFactsForBriefAgent);
        const response = await aiWrapper(callDetailsChat);
        console.log("The response Im about to send is:\\n", response.message);
        if (response.callID === "error") {
            throw new Error(response.message);
        }

        responseMessage = typeof response.message === 'object'
            ? (response.message.answer || JSON.stringify(response.message))
            : response.message;

        // Stage 5: Status Analysis
        const latestFactsForStatusBot = userFacts.get(userId) || '{}';
        const latestMessageString = `User Message: ${message} -> Brief Writer Response: ${responseMessage}`;
        const statusCheckAgentDetails = await statusBot(latestMessageString, "", history, latestFactsForStatusBot); // Pass empty context
        const statusAnalysisResponse = await aiWrapper(statusCheckAgentDetails);

        let statusAnalysis = null;
        if (statusAnalysisResponse && statusAnalysisResponse.message && typeof statusAnalysisResponse.message.status === 'string') {
            statusAnalysis = statusAnalysisResponse.message;
            console.log("Status Analysis Result:", statusAnalysis); // Log for debugging
        } else {
            console.error("Could not get valid status from statusBot:", statusAnalysisResponse);
        }

        // Emit event if brief is complete
        if (statusAnalysis && statusAnalysis.status === 'complete') {
            console.log("Brief status is complete, emitting event to client.");
            io.to(userId).emit('brief complete'); // Emit a specific event
        }

    } else {
        console.log("Question is not relevant. Stopping further processing.");
        responseMessage = "I'm not sure that's an appropriate question.";
    }

    // Store the potentially modified response in conversation history
    await buildConversationHistory(userId, 'server', responseMessage);

    return responseMessage;

}

const userFacts = new Map();

/**
 * Socket.IO connection handler
 * Manages user connections, reconnections, and message processing
 * Implements real-time communication and user session management
 */
io.on('connection', (socket) => {
    // Send configuration including SHOWLOGS
    socket.emit('config', {
        showLogs: process.env.SHOWLOGS === 'true'
    });

    let userId = socket.handshake.query.userId;

    if (userId && activeConnections.has(userId)) {
        console.log('Client reconnected', userId);
        const oldSocket = activeConnections.get(userId);
        oldSocket.disconnect();
    } else {
        userId = uuidv4();
        console.log('New client connected', userId);
    }

    activeConnections.set(userId, socket);
    socket.join(userId);
    socket.emit('set userId', userId);

    // Send the welcome message
    const welcomeMessage = process.env.WELCOME_MESSAGE || 'Welcome to the chat!';
    socket.emit('welcome message', welcomeMessage);

    socket.on('chat message', async (msg) => {
        // Build conversation history
        await buildConversationHistory(userId, 'user', msg);

        try {
            const response = await callEverestChat(msg, userId);
            // Stream the response only to this user's room
            await streamText(socket, response, 'server');
        } catch (error) {
            console.error('Error processing chat message:', error);
            socket.emit('stream chunk', {
                sender: 'server',
                content: 'Sorry, I encountered an error processing your request.',
                isComplete: true
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected', userId);
        activeConnections.delete(userId);
        userFacts.delete(userId);
    });
});

const PORT = process.env.PORT || 3030;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
