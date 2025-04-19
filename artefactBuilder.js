/**
 * Simulates processing a user conversation turn to update product artefacts.
 * Returns a structured object containing the response message, generated artefacts,
 * the full conversation history up to this point, input details, and cost information.
 * @param {object} conversation - The conversation object.
 * @param {string} conversation.message - The latest user message.
 * @param {Array<object>} conversation.history - The history of messages before the current one.
 * @param {Array<object>|null} conversation.artefacts - Artefacts from the previous turn.
 * @param {string} userid - The user ID.
 * @param {object} scope - The current scope object.
 * @returns {Promise<object>} An object containing the processing results including updated history.
 */

// IMPORT REQUIRED AGENTS WE WILL USE FOR THIS TASK
const nextQuestionAgent = require('./agents/nextQuestionAgent');
const artefactAgent = require('./agents/artefactAgent');
const statusBot = require('./agents/statusBot'); // Import statusBot
const fs = require('fs'); // Added for file system access
const path = require('path'); // Added for path manipulation
const aiWrapper = require('./common/aimodels/aiWrapper'); // Used to Call different agents


// --- Internal Helper Function ---

/**
 * Reads all .json files in a directory, parses them, and aggregates their content.
 * Assumes each JSON file has a single top-level key.
 * @param {string} dirPath - The path to the directory to read.
 * @returns {Promise<object>} An object containing the aggregated content, keyed by the top-level key from each file.
 */
async function _readJsonArtefactsFromDir(dirPath) {
    console.log(`--- _readJsonArtefactsFromDir Called for: ${dirPath} ---`);
    const aggregatedArtefacts = {};

    try {
        const entries = fs.readdirSync(dirPath);
        console.log(`Directory entries for ${dirPath}:`, entries);

        for (const entryName of entries) {
            const fullPath = path.join(dirPath, entryName);
            try { // Add try-catch for statSync as well
                const stats = fs.statSync(fullPath);

                if (stats.isFile() && path.extname(entryName).toLowerCase() === '.json') {
                    try {
                        const fileContent = fs.readFileSync(fullPath, 'utf8');
                        const parsedJson = JSON.parse(fileContent);
                        const keys = Object.keys(parsedJson);

                        if (keys.length > 0) {
                            const key = keys[0];
                            aggregatedArtefacts[key] = parsedJson[key];
                            console.log(`Read content from ${entryName} under key '${key}' into aggregated object.`);
                        } else {
                            console.warn(`Skipping ${entryName}: JSON file is empty or has no keys.`);
                        }
                    } catch (parseError) {
                        console.error(`Error reading or parsing JSON file ${entryName}:`, parseError);
                    }
                } else if (stats.isDirectory()) {
                    console.log(`Skipping directory: ${entryName}`);
                } else {
                    console.log(`Skipping non-JSON file: ${entryName}`);
                }
            } catch (statError) {
                console.error(`Error getting stats for ${fullPath}:`, statError);
            }
        }
    } catch (dirError) {
        console.error(`Error reading directory ${dirPath}:`, dirError);
        return {}; // Return empty object on directory read error
    }

    console.log(`Generated aggregated artefacts for ${dirPath}:`, aggregatedArtefacts);
    return aggregatedArtefacts;
}

// --- Public Functions ---

/**
 * Gets the artefact frame (template structure) based on files in the templates directory.
 * Only runs if scope is 'product'.
 * @param {object} scope - The current scope object.
 * @returns {Promise<object>} The artefact frame object.
 */
async function getArtefactFrame(scope) {
    console.log("--- getArtefactFrame Called ---");
    if (scope?.scopelevel !== 'product') {
        console.log("Scope is not 'product', returning empty frame.");
        return {};
    }
    // Read from the templates directory
    return await _readJsonArtefactsFromDir('./999-Product-Docs-Templates');
}

/**
 * Gets the initial state of artefacts based on files in the actual product docs directory.
 * Only runs if scope is 'product'.
 * @param {object} scope - The current scope object.
 * @returns {Promise<object>} The initial artefact state object.
 */
async function getArtefactInitial(scope) {
    console.log("--- getArtefactInitial Called ---");
    if (scope?.scopelevel !== 'product') {
        console.log("Scope is not 'product', returning empty initial state.");
        return {};
    }
    // Read from the actual product docs directory
    return await _readJsonArtefactsFromDir('./000-Product-Docs');
}


// This function will be used to manage a simple 3 step agent workflow to:
// 1) Extract updates to docuemntation objects based on user input
// 2) Figure out the next best question to fill out the requirements form the user
// 3) Reflect and check for completeness of the docuemnation 
async function agentLogic(conversation, userId, artefactFrame) {

}


async function artefactBuilder(conversation, userid, scope) { // Updated param name
    console.log("--- artefactBuilder Called ---");
    console.log("Received Conversation Object:", conversation);
    // console.log("Received Question (message):", conversation.message); // Log specific parts if needed
    // console.log("Received History:", conversation.history);
    // console.log("Received Previous Artefacts:", conversation.artefacts);
    console.log("Received UserID:", userid);
    console.log("Received Scope:", scope);

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate the response message for this turn
    const responseMessage = `${conversation.message} - Of course this is great keep going`;

    // Construct the full history including the current exchange
    const responseHistory = [
        ...(conversation.history || []), // Handle potential undefined history on first call
        { role: 'user', content: conversation.message },
        { role: 'assistant', content: responseMessage }
    ];

    // CALL THE function getArtefactFrame and capture the response as a variable artefactFrame
    // Send the scope object received.
    const artefactFrame = await getArtefactFrame(scope);       // Get the template structure
    const artefactInitial = await getArtefactInitial(scope); // Get the initial data state

    // Construct the mocked response object
    const response = {
        message: responseMessage,
        history: responseHistory, // Include the updated history
        artefacts: [
            { id: 1, name: "artefact 1", data: "stringified data object" } // Mocked artefact - TODO: Replace with actual artefact logic
        ],
        artefactFrame: artefactFrame,     // Include the template frame
        artefactInitial: artefactInitial, // Include the initial state
        input: {
            scope: scope, // Pass the received scope
            question: conversation.message, // The user's latest message
            userID: userid // Pass the received userid
        },
        cost: {
            totalCost: 0 // Mocked cost
        }
    };

    console.log("--- artefactBuilder Processing Complete ---");
    return response; // Return the structured object
}

module.exports = { artefactBuilder };
