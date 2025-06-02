import fs from "fs/promises"
import path from "path"
import { generateText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { openai } from "@ai-sdk/openai"

function convertHtmlEntities(input: string): string {
  return input
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
}

// Automatically detect available AI providers
function detectAvailableProvider() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  
  // Priority: Anthropic > OpenAI (Anthropic typically performs better for code rewriting)
  if (anthropicKey) {
    console.log("🤖 Using Anthropic Claude 3.5 Sonnet provider");
    return {
      model: anthropic("claude-3-5-sonnet-20241022"),
      provider: "anthropic"
    };
  }
  
  if (openaiKey) {
    console.log("🤖 Using OpenAI GPT-4 Turbo provider");
    return {
      model: openai("gpt-4-turbo-preview"),
      provider: "openai"
    };
  }
  
  throw new Error(`
❌ No available API key found.

Please set one of the following environment variables:
  • ANTHROPIC_API_KEY (recommended, Claude performs better for code rewriting)
  • OPENAI_API_KEY

Example:
  export ANTHROPIC_API_KEY="your_key_here"
  export OPENAI_API_KEY="your_key_here"
  `);
}

// Define writeFile utility function
const writeFile = async (filePath: string, fileExtension: string, content: string) => {
  try {
    const originalExt = path.extname(filePath);
    const filePathWithoutExt = filePath.slice(0, -originalExt.length);
    await fs.writeFile(`${filePathWithoutExt}.rewritten${fileExtension}`, content);
    console.log(`File successfully written: ${filePath}`)
  } catch (error) {
    console.error(`Error writing file: ${error}`)
  }
}

export async function rewrite(filePath: string) {
  try {
    // Read file content
    const code = await fs.readFile(filePath, "utf-8")
    
    const prompt = `You are a programming assistant, doing your best to complete the code rewrite I propose.
I will provide compressed JavaScript or JSX code, and you should carefully read it and restore it to normal, readable, and maintainable code.
Follow these rules for rewriting:
1. Infer appropriate variable and function names based on code context.
2. Ignore var n = e("@parcel/transformer-js/src/esmodule-helpers.js");
3. Treat n.defineInteropFlag(r), n.export(r, "getDefaultPreamble", () => l); as exporting l as getDefaultPreamble from the current file
4. If the code contains React components, restore it to JSX code without including react/jsx-runtime, use <> instead of <React.Fragment>

Please only return the rewritten code, without any explanations or formatting markers.

Here is the original code you need to rewrite:

${code}`;

    // Automatically detect and use available AI provider
    const { model, provider } = detectAvailableProvider();
    
    const { text } = await generateText({
      model,
      prompt,
      maxTokens: 8192,
      temperature: 0.1,
    });

    // Infer file extension
    const fileExtension = inferFileExtension(text);
    
    // Process HTML entities and save file
    const cleanedCode = convertHtmlEntities(text);
    await writeFile(filePath, fileExtension, cleanedCode);
    
    console.log(`✅ Code rewrite completed, saved to: ${filePath}${fileExtension}`);
  } catch (error) {
    console.error("Error occurred:", error)
  }
}

// Helper function to infer file extension
function inferFileExtension(code: string): string {
  // Check if code contains JSX syntax
  if (code.includes('jsx') || 
      code.includes('<') && code.includes('/>') ||
      code.includes('React') ||
      code.includes('return (')) {
    return '.jsx';
  }
  return '.js';
}
