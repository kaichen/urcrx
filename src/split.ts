#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

export async function split(filePath: string, searchString: string) {
  const fileExists = await fs.exists(filePath);
  console.log(`开始处理文件：${filePath}`);
  if (!fileExists) {
    console.error(`文件不存在：${filePath}`);
    return;
  }
  try {
    // 导入指定的 js 文件
    const rollupObject = await import(filePath);

    // 获取默认导出的对象
    const rollupContent = rollupObject.default;

    // 使用修改后的 organizeRollupCode 函数
    const { idToFilenameMap, idToFunctionMap } = organizeRollupCode(rollupContent);

    // 为输出创建一个新目录
    const outputDir = path.join(path.dirname('.'), 'output');
    await fs.mkdir(outputDir, { recursive: true });
    // 用于存储每个文件的内容
    const fileContents: { [key: string]: string } = {};

    // 遍历 idToFilenameMap，根据搜索字符串筛选并组织内容
    for (const [id, filename] of Object.entries(idToFilenameMap)) {
      const functionString = idToFunctionMap[id];
      
      if (!searchString || filename.includes(searchString)) {
        // console.log('id:', id, 'filenames:', filename)
        fileContents[filename] = `// ID: ${id}\n${functionString}\n\n`;
      }
    }
    // 写入文件
    for (const [filename, content] of Object.entries(fileContents)) {
      // console.log('filename:', filename, 'content:', content.length)
      if (content.length > 0) {
        let outputFilename = filename;
        if (!path.extname(filename)) {
          outputFilename += '.js';
        }
        const outputPath = path.join(outputDir, outputFilename);
        console.log('outputPath:', outputPath);
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, content);
      }
    }

    console.log(`处理完成。输出目录：${outputDir}`);
  } catch (error) {
    console.error('处理文件时发生错误:', error);
  }
}

function cleanImplementationString(implementationString: string): string {
  const lines = implementationString.split('\n');
  let startIndex = 0;
  let endIndex = lines.length - 1;

  // 去掉开头的 `function(e, t, r) {`
  if (lines[0].trim().startsWith('function(')) {
    startIndex = 1;
  }

  // 去掉最末尾非空行的 `}`
  while (endIndex > startIndex && lines[endIndex].trim() === '') {
    endIndex--;
  }
  if (lines[endIndex].trim() === '}') {
    endIndex--;
  }

  return lines.slice(startIndex, endIndex + 1).join('\n');
}

function organizeRollupCode(rollupObject: any) {
  const idToFilenameMap: { [key: string]: string } = {};
  const idToFunctionMap: { [key: string]: string } = {};

  for (const [id, [implementation, dependencies]] of Object.entries(rollupObject as Record<string, [Function, Record<string, string>]>)) {
    // 记录 id 与文件名称的关系
    for (const [filename, dependencyId] of Object.entries(dependencies)) {
      // 移除重复的赋值
      idToFilenameMap[dependencyId] = filename;
    }
    
    // 记录 id 与函数字符串的关系，并清理实现字符串
    idToFunctionMap[id] = cleanImplementationString(implementation.toString());
  }

  return { idToFilenameMap, idToFunctionMap };
}
