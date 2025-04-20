/**
 * Handles the definition or update process for feature-level documentation.
 */

const inquirer = require('inquirer').default;
const fs = require('fs').promises;
const path = require('path');

async function defineFeature(scope) {
    console.log('--- Defining Feature Level ---');
    console.log('Received Scope:', scope);

    const featureId = scope.feature;
    const productDocsRoot = path.join(__dirname, '000-Product-Docs');
    const templateDir = path.join(__dirname, '999-Product-Docs-Templates', '001-feature-example.json');

    // Determine or create target feature folder
    let targetFolderName;
    try {
        const entries = await fs.readdir(productDocsRoot, { withFileTypes: true });
        const match = entries.find(entry => {
            return entry.isDirectory() && entry.name.startsWith(featureId + '-feature-');
        });
        if (match) {
            targetFolderName = match.name;
            console.log('Found existing feature folder: ' + targetFolderName);
        } else {
            // Prompt for slug
            const answers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'slug',
                    message: 'No folder for feature "' + featureId + '" found. Enter a slug for this feature:'
                }
            ]);
            const slug = answers.slug;
            targetFolderName = featureId + '-feature-' + slug + '.json';
            const newDir = path.join(productDocsRoot, targetFolderName);
            await fs.mkdir(newDir, { recursive: true });
            console.log('Created new feature folder: ' + targetFolderName);
        }
    } catch (err) {
        console.error('Error finding or creating feature folder:', err);
        return;
    }

    // Synchronize template files into target folder
    const targetDir = path.join(productDocsRoot, targetFolderName);
    try {
        const templateFiles = await fs.readdir(templateDir);
        for (const file of templateFiles) {
            // Rename prefix from '001-' to '<featureId>-'
            const destFileName = file.replace(/^001-/, featureId + '-');
            const srcPath = path.join(templateDir, file);
            const destPath = path.join(targetDir, destFileName);

            try {
                await fs.access(destPath);
                // file exists
            } catch {
                // missing: copy it
                await fs.copyFile(srcPath, destPath);
                console.log('Copied template file to: ' + destFileName);
            }
        }
    } catch (err) {
        console.error('Error synchronizing template files:', err);
        return;
    }

    console.log('--- Feature Level Definition Complete ---');
}

module.exports = { defineFeature };
