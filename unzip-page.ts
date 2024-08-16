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

function unzipFile(filePath: string, targetFile: string, outputDir: string = 'output'): void {
  console.log(filePath, targetFile, outputDir);
  
  const fileBuffer = fs.readFileSync(filePath);
  const zipBuffer = crxToZip(fileBuffer);

  yauzl.fromBuffer(zipBuffer, {lazyEntries: true}, (err, zipfile) => {
    if (err) {
      console.error('打开zip文件时发生错误:', err);
      return;
    }

    zipfile.readEntry();
    zipfile.on('entry', (entry) => {
      if (entry.fileName === targetFile) {
        zipfile.openReadStream(entry, (err, readStream) => {
          if (err) {
            console.error('读取文件流时发生错误:', err);
            return;
          }

          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          const outputPath = path.join(outputDir, targetFile);
          const writeStream = fs.createWriteStream(outputPath);
          readStream.pipe(writeStream);
          writeStream.on('finish', () => {
            console.log(`文件 ${targetFile} 已成功解压到 ${outputDir} 目录`);
            
            // 读取解压后的文件内容
            const fileContent = fs.readFileSync(outputPath, 'utf8');
            
            // 使用js-beautify美化文件内容
            const beautifiedContent = beautify.js(fileContent, { indent_size: 2, space_in_empty_paren: true });
            
            // 将美化后的内容写回文件
            fs.writeFileSync(outputPath, beautifiedContent);
            
            console.log(`文件 ${targetFile} 已成功美化`);
            
            zipfile.close();
          });
        });
      } else {
        zipfile.readEntry();
      }
    });
  });
}

const filePath = process.argv[2];
const targetFile = process.argv[3];

if (!filePath || !targetFile) {
  console.error('请提供文件路径和目标文件名作为命令行参数');
  console.error('使用方法: ts-node unzip-page.ts <文件路径> <目标文件名>');
  process.exit(1);
}

unzipFile(filePath, targetFile);