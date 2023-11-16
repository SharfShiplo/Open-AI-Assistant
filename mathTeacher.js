import dotenv from "dotenv";
import OpenAI from "openai";
import readLine from "readline";
dotenv.config();
const readline = readLine.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Create a OpenAI connection object
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // defaults to process.env["OPENAI_API_KEY"]
});

async function askQuestion(question) {
  return new Promise((resolve, reject) => {
    readline.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  try {
    const assistant = await openai.beta.assistants.create({
      name: "Math Tutor",
      instructions:
        "You are a personal math tutor, Write and run code to answer math questions.",
      tools: [{ type: "code_interpreter" }],
      model: "gpt-4-1106-preview",
    });

    // Log the first greeting
    console.log(
      "\nHellow there, I'm your personal math tutor, Ask some complicated questions."
    );

    // Create a thread
    const thread = await openai.beta.threads.create();

    //Use keepAsking as state for keep asking questions
    let keepAsking = true;

    while (keepAsking) {
      const userQuestion = await askQuestion("\n What is your Question?");
      // Pass in the user question into the existiong thred
      await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: userQuestion,
      });

      // Use runs to wait for the assistant response and then retriv=eve is
      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistant.id,
      });

      let runStatus = await openai.beta.threads.runs.retrieve(
        thread.id,
        run.id
      );
      // Polling mechanism to see if runStatus is completed
      // This should be made more robust.
      while (runStatus.status !== "completed") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      }

      // Get the last assistant message from the messages array
      const messages = await openai.beta.threads.messages.list(thread.id);

      // Find the last message from the current run
      const lastMessageForRun = messages.data
        .filter((msg) => msg.run_id === run.id && msg.role === "assistant")
        .pop();

      // if an assistant message is found, console.log() it
      if (lastMessageForRun) {
        console.log(`${lastMessageForRun.content[0].text.value}`);
      }

      // Then ask if the user wants to ask another question and update keepAsking state
      const continueAsking = await askQuestion(
        "Do you want to ask another question> (yes/no)?"
      );
      keepAsking = continueAsking.toLowerCase() === "yes";
      // If the keepAsking state is falsy show an ending message
      if (!keepAsking) {
        console.log("Alrighty then, I hope you learned something!\n");
      }
    }
    // close the readline
    readline.close();
  } catch (error) {
    console.error(error);
  }
}

// Call the main function
main();
