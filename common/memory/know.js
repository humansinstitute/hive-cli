require("dotenv").config({ path: `.env` });
const OpenAI = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');
const { v4: uuidv4 } = require('uuid');
const aiWrapper = require('../aimodels/aiWrapper');
const contextBot = require('../../agents/contextBot');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API,
});

const pc = new Pinecone({
    apiKey: process.env.PINECONE_API
});

function prepareContext(dataArray) {
    let context = "Context retrieved from your knowledge base is, please use this as reference when answering questions:\n";

    dataArray.forEach((item, index) => {
        context += `Context: ${index + 1}:\n`;
        context += `Source: ${item.title}-${item.source}\n`;
        context += `Content: ${item.text.substring(0, 2000)}...\n\n`; // Limit to first 2000 characters
    });
    // console.log("Context:", context);
    return context;
}

const know = async (message) => {

    const prompt = message;

    try {
        const response = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: [prompt],
        });

        // console.log(`Embedding for input: `, response.data[0].embedding);

        const index = pc.index(process.env.PINECONE_INDEX);

        const queryResponse = await index.namespace(process.env.PINECONE_NAMESPACE).query({
            vector: response.data[0].embedding,
            topK: 3,
            includeMetadata: true,
            includeValues: false,
        });

        // console.log("Query Response:", queryResponse);
        // console.log("Query Usage: ", queryResponse.usage);

        const metadataArray = queryResponse.matches.map(match => match.metadata);

        const rawMessageContext = await prepareContext(metadataArray);
        const callDetails = await contextBot(rawMessageContext, prompt, ""); //message, context, history
        const messageContext = await aiWrapper(callDetails);
        // console.log("messageContext: ", messageContext);
        return messageContext;


    } catch (error) {
        console.error("Error calling API:", error);
    }
};

module.exports = know;