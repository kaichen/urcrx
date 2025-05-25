import * as fs from 'fs';
import * as path from 'path';
import * as yauzl from 'yauzl';
import * as beautify from 'js-beautify';

function crxToZip(buf: Buffer): Buffer {
  function calcLength(a: number, b: number, c: number, d: number): number {
    let length = 0;
    length += a << 0;
    length += b << 8;
    length += c << 16;
    length += d << 24 >>> 0;
    return length;
  }

  if (buf[0] === 80 && buf[1] === 75 && buf[2] === 3 && buf[3] === 4) {
    return buf;
  }

  if (buf[0] !== 67 || buf[1] !== 114 || buf[2] !== 50 || buf[3] !== 52) {
    throw new Error("无效的头部: 不是以Cr24开始");
  }

  const isV3 = buf[4] === 3;
  const isV2 = buf[4] === 2;

  if ((!isV2 && !isV3) || buf[5] || buf[6] || buf[7]) {
    throw new Error("意外的crx格式版本号");
  }

  if (isV2) {
    const publicKeyLength = calcLength(buf[8], buf[9], buf[10], buf[11]);
    const signatureLength = calcLength(buf[12], buf[13], buf[14], buf[15]);
    const zipStartOffset = 16 + publicKeyLength + signatureLength;
    return buf.slice(zipStartOffset);
  } else {
    const headerSize = calcLength(buf[8], buf[9], buf[10], buf[11]);
    const zipStartOffset = 12 + headerSize;
    return buf.slice(zipStartOffset);
  }
}

export function unzip(filePath: string, targetFile?: string, outputDir: string = 'output', inspect: boolean = false): void {
  const fileBuffer = fs.readFileSync(filePath);
  const zipBuffer = crxToZip(fileBuffer);

  // 自动创建 outputDir
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  yauzl.fromBuffer(zipBuffer, {lazyEntries: true}, (err, zipfile) => {
    if (err) {
      console.error('打开zip文件时发生错误:', err);
      return;
    }

    // inspect 模式：只打印文件树
    if (inspect) {
      const files: string[] = [];
      zipfile.readEntry();
      zipfile.on('entry', (entry) => {
        files.push(entry.fileName);
        zipfile.readEntry();
      });
      zipfile.on('end', () => {
        console.log('【--inspect模式】文件树如下:');
        const tree = buildTree(files);
        printTree(tree);
        console.log(`共 ${files.length} 个文件。`);
        zipfile.close();
      });
      zipfile.on('error', (err) => {
        console.error('读取zip条目时发生错误:', err);
        zipfile.close();
      });
      return;
    }

    if (!targetFile) {
      // 只处理所有.js文件，不显示文件树
      const jsFiles: yauzl.Entry[] = [];
      zipfile.readEntry();
      zipfile.on('entry', (entry) => {
        if (entry.fileName.endsWith('.js')) {
          jsFiles.push(entry);
        }
        zipfile.readEntry();
      });
      zipfile.on('end', () => {
        if (jsFiles.length === 0) {
          console.log('未找到任何.js文件。');
          zipfile.close();
          return;
        }
        let finished = 0;
        jsFiles.forEach((entry) => {
          processJsFile(entry, zipfile, outputDir, () => {
            finished++;
            if (finished === jsFiles.length) {
              zipfile.close();
              console.log('所有.js文件处理完毕。');
            }
          });
        });
      });
      zipfile.on('error', (err) => {
        console.error('读取zip条目时发生错误:', err);
        zipfile.close();
      });
    } else {
      zipfile.readEntry();
      zipfile.on('entry', (entry) => {
        const genericFileName = entry.fileName.split('.')[0] + '.js';
        if (entry.fileName === targetFile || (genericFileName === targetFile && entry.fileName.endsWith('.js'))) {
          processJsFile(entry, zipfile, outputDir, () => {
            zipfile.close();
          });
        } else {
          zipfile.readEntry();
        }
      });
    }
  });
}

function processJsFile(entry: yauzl.Entry, zipfile: yauzl.ZipFile, outputDir: string, onFinish: () => void) {
  // 保持原有目录结构，且 .js 文件重命名为 genericFileName
  const parsed = path.parse(entry.fileName);
  const genericFileName = parsed.name + '.js';
  const relativeDir = parsed.dir; // 可能为''或多级目录
  const outputDirPath = path.join(outputDir, relativeDir);
  const outputPath = path.join(outputDirPath, genericFileName);

  zipfile.openReadStream(entry, (err, readStream) => {
    if (err) {
      console.error('读取文件流时发生错误:', err);
      onFinish();
      return;
    }

    if (!fs.existsSync(outputDirPath)) {
      fs.mkdirSync(outputDirPath, { recursive: true });
    }

    const writeStream = fs.createWriteStream(outputPath);
    readStream.pipe(writeStream);
    writeStream.on('finish', () => {
      console.log(`文件 ${entry.fileName} 已成功解压到 ${outputPath}`);

      // 读取解压后的文件内容
      const fileContent = fs.readFileSync(outputPath, 'utf8');

      // 使用js-beautify美化文件内容
      const beautifiedContent = beautify.js(fileContent, { indent_size: 2, space_in_empty_paren: true });

      // 将美化后的内容写回文件
      fs.writeFileSync(outputPath, beautifiedContent);

      console.log(`文件 ${outputPath} 已成功美化`);
      onFinish();
    });
    writeStream.on('error', (err) => {
      console.error('写入文件时发生错误:', err);
      onFinish();
    });
  });
}

// 仅 inspect 模式下需要的辅助函数
interface TreeNode {
  [key: string]: TreeNode | null;
}

function buildTree(files: string[]): TreeNode {
  const tree: TreeNode = {};
  files.forEach(filePath => {
    const parts = filePath.split('/').filter(part => part !== '');
    let currentLevel = tree;
    parts.forEach((part, index) => {
      if (!currentLevel[part]) {
        currentLevel[part] = index === parts.length - 1 ? null : {};
      }
      if (currentLevel[part] !== null) {
        currentLevel = currentLevel[part] as TreeNode;
      }
    });
  });
  return tree;
}

function printTree(node: TreeNode | null, prefix = '', isLast = true): void {
  if (!node) {
    return;
  }
  const entries = Object.entries(node);
  entries.forEach(([name, childNode], index) => {
    const connector = isLast ? '└── ' : '├── ';
    const childIsLast = index === entries.length - 1;
    console.log(`${prefix}${connector}${name}`);
    if (childNode) {
      const childPrefix = prefix + (isLast ? '    ' : '│   ');
      printTree(childNode, childPrefix, childIsLast);
    }
  });
}
