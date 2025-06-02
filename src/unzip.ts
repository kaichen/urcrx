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
    throw new Error("Invalid header: does not start with Cr24");
  }

  const isV3 = buf[4] === 3;
  const isV2 = buf[4] === 2;

  if ((!isV2 && !isV3) || buf[5] || buf[6] || buf[7]) {
    throw new Error("Unexpected crx format version");
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

export function unzip(filePath: string, targetFile?: string, outputDir: string = 'output', inspect: boolean = false): Promise<void> {
  return new Promise((resolve, reject) => {
    const fileBuffer = fs.readFileSync(filePath);
    const zipBuffer = crxToZip(fileBuffer);

    // Automatically create outputDir
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    yauzl.fromBuffer(zipBuffer, {lazyEntries: true}, (err, zipfile) => {
      if (err) {
        console.error('Error opening zip file:', err);
        reject(err);
        return;
      }

      // inspect mode: only print file tree
      if (inspect) {
        const files: string[] = [];
        zipfile.readEntry();
        zipfile.on('entry', (entry) => {
          files.push(entry.fileName);
          zipfile.readEntry();
        });
        zipfile.on('end', () => {
          console.log('【--inspect mode】File tree:');
          const tree = buildTree(files);
          printTree(tree);
          console.log(`Total ${files.length} files.`);
          zipfile.close();
          resolve();
        });
        zipfile.on('error', (err) => {
          console.error('Error reading zip entries:', err);
          zipfile.close();
          reject(err);
        });
        return;
      }

      if (!targetFile) {
        // Only process all .js files, don't show file tree
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
            console.log('No .js files found.');
            zipfile.close();
            resolve();
            return;
          }
          let finished = 0;
          let hasError = false;
          jsFiles.forEach((entry) => {
            processJsFile(entry, zipfile, outputDir, (error?: Error) => {
              if (error && !hasError) {
                hasError = true;
                zipfile.close();
                reject(error);
                return;
              }
              finished++;
              if (finished === jsFiles.length && !hasError) {
                zipfile.close();
                console.log('All .js files processed.');
                resolve();
              }
            });
          });
        });
        zipfile.on('error', (err) => {
          console.error('Error reading zip entries:', err);
          zipfile.close();
          reject(err);
        });
      } else {
        zipfile.readEntry();
        zipfile.on('entry', (entry) => {
          const genericFileName = entry.fileName.split('.')[0] + '.js';
          if (entry.fileName === targetFile || (genericFileName === targetFile && entry.fileName.endsWith('.js'))) {
            processJsFile(entry, zipfile, outputDir, (error?: Error) => {
              zipfile.close();
              if (error) {
                reject(error);
              } else {
                resolve();
              }
            });
          } else {
            zipfile.readEntry();
          }
        });
      }
    });
  });
}

function processJsFile(entry: yauzl.Entry, zipfile: yauzl.ZipFile, outputDir: string, onFinish: (error?: Error) => void) {
  // Maintain original directory structure and rename .js files to genericFileName
  const parsed = path.parse(entry.fileName);
  const genericFileName = parsed.name + '.js';
  const relativeDir = parsed.dir; // Can be '' or multi-level directory
  const outputDirPath = path.join(outputDir, relativeDir);
  const outputPath = path.join(outputDirPath, genericFileName);

  zipfile.openReadStream(entry, (err, readStream) => {
    if (err) {
      console.error('Error reading file stream:', err);
      onFinish(err);
      return;
    }

    if (!fs.existsSync(outputDirPath)) {
      fs.mkdirSync(outputDirPath, { recursive: true });
    }

    const writeStream = fs.createWriteStream(outputPath);
    readStream.pipe(writeStream);
    writeStream.on('finish', () => {
      console.log(`File ${entry.fileName} successfully extracted to ${outputPath}`);

      // Read the extracted file content
      const fileContent = fs.readFileSync(outputPath, 'utf8');

      // Beautify file content using js-beautify
      const beautifiedContent = beautify.js(fileContent, { indent_size: 2, space_in_empty_paren: true });

      // Write beautified content back to file
      fs.writeFileSync(outputPath, beautifiedContent);

      console.log(`File ${outputPath} successfully beautified`);
      onFinish();
    });
    writeStream.on('error', (err) => {
      console.error('Error writing file:', err);
      onFinish(err);
    });
  });
}

// Helper functions only needed in inspect mode
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
