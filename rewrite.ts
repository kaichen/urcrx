import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';

const anthropic = new Anthropic({});

async function rewriteCode(filePath: string) {
  try {
    // 读取文件内容
    const code = await fs.readFile(filePath, 'utf-8');
    
    // 定义 writeFile 工具函数
    const writeFile = async (filePath: string, content: string) => {
      try {
        await fs.writeFile(filePath, content);
        console.log(`文件已成功写入：${filePath}`);
      } catch (error) {
        console.error(`写入文件时发生错误：${error}`);
      }
    };

    // 调用 Anthropic API 重写代码
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 4096,
      messages: [
        { 
          role: "user", 
          content: `你作为编程助手，竭尽所能帮助我完成编程。请重写以下 JavaScript/JSX 代码，并进行优化。重写完成后，请使用 writeFile 工具函数将结果写入文件。文件路径应为原文件名加上 "_rewritten" 后缀。以下是原始代码：\n\n${code}` 
        }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "writeFile",
            description: "将内容写入指定文件",
            parameters: {
              type: "object",
              properties: {
                filePath: {
                  type: "string",
                  description: "要写入的文件路径"
                },
                content: {
                  type: "string",
                  description: "要写入文件的内容"
                }
              },
              required: ["filePath", "content"]
            }
          }
        }
      ]
    });

    // 获取重写后的代码和工具调用
    const rewrittenCode = (response.content[0] as { text: string }).text;
    const toolCalls = (response.content[0] as { tool_calls?: Array<{ function: { name: string, arguments: string } }> }).tool_calls;
    // 如果有工具调用，执行写文件操作
    if (toolCalls && toolCalls.length > 0) {
      const writeFileCall = toolCalls.find(call => call.function.name === "writeFile");
      if (writeFileCall) {
        const { filePath, content } = JSON.parse(writeFileCall.function.arguments);
        await writeFile(filePath, content);
      }
    }
    // 打印重写后的代码
    console.log('重写后的代码：');
    console.log(rewrittenCode);

    // 将重写后的代码保存到新文件
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    const newFilePath = path.join(dir, `${baseName}_rewritten${ext}`);
    await fs.writeFile(newFilePath, rewrittenCode);
    console.log(`重写后的代码已保存到：${newFilePath}`);

  } catch (error) {
    console.error('发生错误：', error);
  }
}

// 获取命令行参数中的文件路径
const filePath = process.argv[2];

if (!filePath) {
  console.error('请提供文件路径作为命令行参数');
  process.exit(1);
}

rewriteCode(filePath);
