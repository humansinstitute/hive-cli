const readline = require('readline');
const { artefactBuilder, getArtefactInitial, getArtefactFrame } = require('./artefactBuilder'); // Import the builder and initial loaders
const fs = require('fs');
const path = require('path');

function logArtefact({ pbrief, architecture, features }) {
    console.log("\n--- Our Updated Artefact ---\n");
    console.log(pbrief);
    console.log(architecture);
    console.log(features);
}

/**
 * Handles the definition or update process for product-level documentation
 * via an interactive chat interface.
 * @param {object} scope - The current scope object.
 * @returns {Promise<void>} Resolves when the user exits the chat.
 */
async function defineProduct(scope) {
    console.log("--- Defining Product Level ---");
    // console.log("Received Scope:", scope);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Load initial artefacts and frame
    const { data: initialData, filePaths } = await getArtefactInitial(scope);
    const frame = await getArtefactFrame(scope);

    let lastArtefactInitial = { data: initialData, filePaths };
    let lastArtefacts = [initialData];
    let lastArtefactFrame = frame;

    // Determine initial question
    let question;
    if (initialData.pbrief?.product_name && initialData.pbrief?.product_brief) {
        console.log("\n--- Your Current Artefact ---\n");
        logArtefact(initialData);
        question = "What updates would you like to make?";
    } else {
        question = process.env.WELCOME_MESSAGE;
    }

    let history = [
        { role: 'assistant', content: question }
    ];

    // Use a promise to handle the async nature of readline
    return new Promise(async (resolve) => {
        const askQuestion = async () => {
            // Use the current question for the prompt
            console.log("\n--- Agent Questions ---\n");
            rl.question(`${question} \n\n`, async (answer) => { // Added space for better formatting
                const userInput = answer.trim();

                if (userInput.toLowerCase() === 'exit') {
                    // console.log("Exiting product definition.");
                    // console.log("Final Scope:", scope);
                    await new Promise(res => setTimeout(res, 2000)); // Wait 2 seconds
                    rl.close();
                    console.log("--- Product Level Definition Complete ---");
                    resolve(); // Resolve the promise to signal completion
                } else {
                    if (userInput === '/update') {
                        const artefactsObj = lastArtefacts[0];
                        const fileMap = lastArtefactInitial.filePaths;
                        for (const key of Object.keys(artefactsObj)) {
                            const filePath = fileMap[key];
                            if (filePath) {
                                fs.writeFileSync(filePath, JSON.stringify({ [key]: artefactsObj[key] }, null, 2) + '\n');
                            }
                        }
                        console.log('Artefact files updated.');
                        return askQuestion();
                    }
                    // Construct the conversation object for the builder
                    const conversation = {
                        message: userInput,
                        history: history,
                        artefacts: lastArtefacts,
                        artefactFrame: lastArtefactFrame, // Pass the last frame
                        artefactInitial: lastArtefactInitial // Pass the last initial state
                    };

                    // Call artefactBuilder with the conversation object
                    try {
                        const builderResponse = await artefactBuilder(conversation, 'pw21', scope);

                        // Log the response object for debugging (optional)
                        console.log('Artefact Builder Response:', builderResponse);
                        // Log the current product artefact in total for easy reading on screen. 
                        console.log(builderResponse.artefacts[0].pbrief);
                        console.log(builderResponse.artefacts[0].architecture);
                        console.log(builderResponse.artefacts[0].features);

                        // Update state for the next turn
                        history = builderResponse.history; // Update history from the response
                        lastArtefacts = builderResponse.artefacts; // Update artefacts from the response
                        lastArtefactFrame = builderResponse.artefactFrame; // Store the new frame
                        lastArtefactInitial = {
                            data: builderResponse.artefactInitial,
                            filePaths: builderResponse.artefactPaths
                        }; // Store the new initial state including file paths
                        question = builderResponse.message; // Update the question for the next prompt

                        // Ask the next question
                        askQuestion();
                    } catch (error) {
                        console.error("Error calling artefactBuilder:", error);
                        // Decide how to handle errors, maybe ask again or exit
                        askQuestion(); // Ask again even if there's an error for now
                    }
                }
            });
        };

        // Start the conversation
        askQuestion();
    });
}

module.exports = { defineProduct };
