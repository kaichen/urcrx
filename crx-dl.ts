import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { URLSearchParams } from 'url';
import { Readable } from 'stream';

async function downloadCrx(extensionUrl: string, outputPath?: string): Promise<void> {
  try {
    // 从URL中提取扩展ID
    const extId = extractExtensionId(extensionUrl);
    if (!extId) {
      throw new Error('无法从URL中提取扩展ID');
    }

    // 构建CRX下载URL
    const crxBaseUrl = 'https://clients2.google.com/service/update2/crx';
    const params = new URLSearchParams({
      response: 'redirect',
      prodversion: '91.0',
      acceptformat: 'crx2,crx3',
      x: `id=${extId}&uc`
    });
    const crxUrl = `${crxBaseUrl}?${params.toString()}`;

    // 设置输出路径
    const crxPath = outputPath || `${extId}.crx`;

    // 下载CRX文件
    const response = await fetch(crxUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    if (!response.body) {
      throw new Error('Response body is null');
    }

    // 将ReadableStream转换为Node.js的Readable
    const nodeStream = Readable.fromWeb(response.body);

    // 保存文件
    const fileStream = createWriteStream(crxPath);
    await pipeline(nodeStream, fileStream);

    console.log(`CRX文件已下载到: ${crxPath}`);
  } catch (error) {
    console.error('下载CRX文件时发生错误:', error);
    throw error;
  }
}

function extractExtensionId(url: string): string | null {
  const match = url.match(/\/([a-z]{32})/i);
  return match ? match[1] : null;
}

// 使用命令行传入 extension url
const extensionUrl = process.argv[2];
if (!extensionUrl) {
  console.error('请提供扩展URL');
  process.exit(1);
}

downloadCrx(extensionUrl)
  .then(() => console.log('CRX文件下载完成'))
  .catch(error => console.error('下载失败:', error));