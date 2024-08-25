import fs from "fs/promises"
import path from "path"
import Anthropic from "@anthropic-ai/sdk"

function convertHtmlEntities(input: string): string {
  return input
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
}

const anthropic = new Anthropic()

// 定义 writeFile 工具函数
const writeFile = async (filePath: string, fileExtension: string, content: string) => {
  try {
    const originalExt = path.extname(filePath);
    const filePathWithoutExt = filePath.slice(0, -originalExt.length);
    await fs.writeFile(`${filePathWithoutExt}.rewritten${fileExtension}`, content);
    console.log(`文件已成功写入：${filePath}`)
  } catch (error) {
    console.error(`写入文件时发生错误：${error}`)
  }
}

export async function rewrite(filePath: string) {
  try {
    // 读取文件内容
    const code = await fs.readFile(filePath, "utf-8")
    const userMessage: Anthropic.MessageParam = {
      role: 'user',
      content: `你作为编程助手，竭尽所能完成我提出代码改写。
  我会给出被压缩过的 JavaScript 或 JSX 代码，你仔细阅读代码，将它还原回正常可阅读维护代码，最后调用工具保存。
  按照以下规则进行重写，
  1. 将变量和函数命名根据代码上下文进行推断得到合适命名。
  2. 忽略 var n = e("@parcel/transformer-js/src/esmodule-helpers.js");
  3. 将 n.defineInteropFlag(r), n.export(r, "getDefaultPreamble", () => l); 视为 export 当前文件中的 l 为 getDefaultPreamble
  4. 如果发现代码包含 React 组件将代码还原回 jsx 代码，无需包含 react/jsx-runtime，使用 <> 而非 <React.Fragment>
  提供的 tools：
  - save_rewritten_code 将改写后的代码写入指定文件
  注意，如果选择调用 tools，则无需将结果代码回复我，仅需要调用 tools
  以下是你需要改写的原始代码：\n\n${code}`
    };
  
    const tools: Anthropic.Tool[] = [
      {
        name: "save_rewritten_code",
        description: "save the rewritten code to the file",
        input_schema: {
          type: "object",
          properties: {
            file_extension: {
              type: "string",
              description: "The file extension of the file. This should be a valid file extension such as .js or .jsx."
            },
            source_code: {
              type: "string",
              description: "The content of the file. This should include all necessary code, comments, and formatting."
            }
          },
          required: ["source_code"]
        }
      }
    ]

    // 调用 Anthropic API 重写代码
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 8192,
      messages: [userMessage],
      tools
    })

    // 获取重写后的代码和工具调用
    const toolUse = message.content.find(item => item.type === "tool_use");

    console.log(message, toolUse)

    if (message.stop_reason === 'tool_use' && toolUse) {
        const { name, input } = toolUse;
        if (name === "save_rewritten_code") {
          await writeFile(filePath, input['file_extension'], convertHtmlEntities(input['source_code']));
        }
    }
  } catch (error) {
    console.error("发生错误：", error)
  }
}
