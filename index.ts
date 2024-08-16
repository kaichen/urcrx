#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { program } = require('commander');

program
  .version('1.0.0')
  .description('Process a Rollup file and organize its code')
  .requiredOption('-f, --file <path>', 'Path to the Rollup file')
  .option('-s, --search <string>', 'Filter string to search in implementations', '')
  .parse(process.argv);

const options = program.opts();

async function processRollupFile(filePath: string, searchString: string) {
  const fileExists = await fs.exists(filePath);
  console.log(`处理文件：${filePath}`);
  try {
    // 读取文件内容
    const fileContent = await fs.readFile(filePath, 'utf8');

    // 将文件内容解析为 JavaScript 对象
    const rollupObject = eval('(' + fileContent + ')');

    // 使用修改后的 organizeRollupCode 函数
    const { idToFilenameMap, idToFunctionMap } = organizeRollupCode(rollupObject);

    // 为输出创建一个新目录
    const outputDir = path.join(path.dirname(filePath), 'output');
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

function organizeRollupCode(rollupObject: any) {
  // console.log('rollupObject:')
  const idToFilenameMap: { [key: string]: string } = {};
  const idToFunctionMap: { [key: string]: string } = {};

  for (const [id, [implementation, dependencies]] of Object.entries(rollupObject as Record<string, [Function, Record<string, string>]>)) {
    // 记录 id 与文件名称的关系
    for (const [filename, dependencyId] of Object.entries(dependencies)) {
      // 移除重复的赋值
      idToFilenameMap[dependencyId] = filename;
    }
    
    // 记录 id 与函数字符串的关系
    idToFunctionMap[id] = implementation.toString();
  }

  return { idToFilenameMap, idToFunctionMap };
}

// 运行主函数
processRollupFile(options.file, options.search);
