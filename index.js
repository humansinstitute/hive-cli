/**
 * HIVE CLI
 * 
 * This application will help you through a CLI wizard to define new features for your application. 
 */

// IMPORT REQUIRED AGENTS WE WILL USE FOR THIS TASK
// const briefAgent = require('./agents/briefAgent');
// const gateKeeper = require('./agents/gateKeeper');
// const factBot = require('./agents/factBot');
// const statusBot = require('./agents/statusBot'); // Import statusBot
// const aiWrapper = require('./common/aimodels/aiWrapper'); // Used to Call different agents
// inquirer will be imported dynamically below
const fs = require('fs').promises; // Use promises API for async file reading
const path = require('path'); // To construct the file path reliably
const { defineProduct } = require('./defineProduct'); // Import defineProduct
const { defineFeature } = require('./definefeature'); // Import defineFeature

const { v4: uuidv4 } = require('uuid');
require("dotenv").config({ path: `.env` });


async function hivecli() { // Removed message and userId parameters as they are not used
    console.log("Welcome to the HIVE CLI Feature Definition Wizard!");

    try {
        // Dynamically import inquirer and Separator
        const inquirer = await import('inquirer');
        // Try accessing Separator from the default export
        const Separator = inquirer.default.Separator;

        const answers = await inquirer.default.prompt([ // Use inquirer.default.prompt for dynamic import
            {
                type: 'list',
                name: 'scopeLevel',
                message: 'What level of update do you want to make?',
                choices: [
                    'Product Level Updates',
                    'Feature Level updates',
                    '---', // Use a simple string separator
                    'Exit'
                ],
            },
        ]);

        switch (answers.scopeLevel) {
            case 'Product Level Updates':
                const productScope = { scopelevel: "product", feature: "false" };
                await defineProduct(productScope);
                // Optionally, loop back to the main menu or exit
                // hivecli(); // Loop back
                console.log("\nReturning to main menu...\n");
                await hivecli(); // Loop back after product definition
                break;
            case 'Feature Level updates':
                try {
                    const featuresFilePath = path.join(__dirname, '000-Product-Docs', '000-03-features.json');
                    let featuresData;
                    let existingFeatures = [];
                    try {
                        const fileContent = await fs.readFile(featuresFilePath, 'utf8');
                        featuresData = JSON.parse(fileContent);
                        if (featuresData && featuresData.features_list && Array.isArray(featuresData.features_list)) {
                            existingFeatures = featuresData.features_list;
                        }
                    } catch (readError) {
                        if (readError.code !== 'ENOENT') {
                            console.error("Error reading features file:", readError);
                            // Decide how to handle - maybe go back to main menu?
                            await hivecli();
                            return; // Stop further execution in this case
                        }
                        // If ENOENT, proceed with empty existingFeatures, allowing 'Define new'
                    }

                    const featureChoices = existingFeatures.map(feature => ({
                        name: `${feature.feature_ref}: ${feature.feature_name} (${feature.feature_status || 'N/A'})`,
                        value: feature.feature_ref
                    }));

                    // Add "Define new" option
                    featureChoices.push(new Separator()); // Use Separator from dynamic import
                    featureChoices.push({ name: 'Define a new feature', value: 'new' });

                    const featureAnswer = await inquirer.default.prompt([ // Use inquirer.default.prompt
                        {
                            type: 'list',
                            name: 'selectedFeature',
                            message: 'Select a feature to update or define a new one:',
                            choices: featureChoices,
                        }
                    ]);

                    const scope = { scopelevel: "feature", feature: featureAnswer.selectedFeature };
                    await defineFeature(scope); // Pass the scope to defineFeature

                } catch (error) {
                    console.error("An error occurred during feature selection:", error);
                }
                console.log("\nReturning to main menu...\n");
                await hivecli(); // Loop back after feature definition
                break;
            case 'Exit':
                console.log("Exiting HIVE CLI. Goodbye!");
                process.exit(0); // Exit the application
                break;
            default:
                console.log("Invalid selection.");
                await hivecli(); // Loop back on invalid selection
        }

    } catch (error) {
        console.error("An error occurred:", error);
        // Decide if you want to retry or exit on error
        // await hivecli(); // Retry
        process.exit(1); // Exit with error code
    }
}

// Start the CLI wizard
hivecli();
