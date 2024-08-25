import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { URLSearchParams } from 'url';
import { Readable } from 'stream';

export async function downloadCrx(extensionUrl: string, outputPath?: string): Promise<void> {
  if (!extensionUrl) {
    throw new Error('URL不能为空');
  }

  try {
    new URL(extensionUrl);
  } catch (error) {
    throw new Error('无效的URL格式');
  }

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
