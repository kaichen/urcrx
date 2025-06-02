import { generateText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { openai } from "@ai-sdk/openai"

export interface LLMProvider {
  model: any;
  provider: string;
  name: string;
}

export interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
}

// Automatically detect available AI provider
export function detectAvailableProvider(): LLMProvider {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  
  // Priority: Anthropic > OpenAI (Anthropic typically performs better for analysis)
  if (anthropicKey) {
    console.log("🤖 Using Anthropic Claude 4 Sonnet");
    return {
      model: anthropic("claude-sonnet-4-20250514"),
      provider: "anthropic",
      name: "Claude 4 Sonnet"
    };
  }
  
  if (openaiKey) {
    console.log("🤖 Using OpenAI GPT-4.1");
    return {
      model: openai("gpt-4.1"),
      provider: "openai", 
      name: "GPT-4.1"
    };
  }
  
  throw new Error(`
❌ No available API key found.

Please set one of the following environment variables:
  • ANTHROPIC_API_KEY (recommended)
  • OPENAI_API_KEY

Example:
  export ANTHROPIC_API_KEY="your_key_here"
  export OPENAI_API_KEY="your_key_here"
  `);
}

// Generate text using the detected provider
export async function generateLLMText(
  prompt: string, 
  options: LLMOptions = {}
): Promise<string> {
  const { model } = detectAvailableProvider();
  
  const { text } = await generateText({
    model,
    prompt,
    maxTokens: options.maxTokens || 8192,
    temperature: options.temperature || 0.1,
  });

  return text;
}

// Get the unified LLM provider
export function getLLMProvider(): LLMProvider {
  return detectAvailableProvider();
}