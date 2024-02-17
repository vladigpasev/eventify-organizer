'use server';
import OpenAI from 'openai';

const openai = new OpenAI({
    organization: "org-aNz8Hs6PinAJZz5FQPF9HbjN",
    apiKey: process.env.OPENAI_API_KEY,
});

export async function generateDescription(eventName: any, category: any) {
    // Define a schema for event data validation
    const thread = await openai.beta.threads.create();
    const message = await openai.beta.threads.messages.create(
        thread.id,
        {
            role: "user",
            content: `Title: ${eventName} ; Category: ${category}`
        }
    );

    const run = await openai.beta.threads.runs.create(
        thread.id,
        {
            assistant_id: 'asst_gTITZUPA0A3pTEfbd1LijLqM'
        }
    );

    const checkRunStatus = async () => {
        try {
            const status = await openai.beta.threads.runs.retrieve(thread.id, run.id);
            return status.status === 'completed';
        } catch (error) {
            console.error("Error checking run status:", error);
            return false;
        }
    };

    let isCompleted = await checkRunStatus();

    while (!isCompleted) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // wait for 2 seconds
        isCompleted = await checkRunStatus();
    }


    const messages = await openai.beta.threads.messages.list(thread.id);

    const assistantMessage = messages.data.find(message => message.role === 'assistant');

    if (assistantMessage && assistantMessage.content) {
        //@ts-ignore
        const responseText = assistantMessage.content.map(content => content.text.value).join(' ');
        console.log("Assistant's Response: ", responseText);
        return responseText;
    } else {
        console.error("No response from the assistant found");
        return "No response from the assistant found";
    }
}