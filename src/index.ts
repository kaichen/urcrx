import { downloadCrx } from './download';
import { unzip } from './unzip';
import { split } from './split';
import { normalize } from './normalize';
import { rewrite } from './rewrite';
import { analyzeExtension } from './analyze';
import { detectAvailableProvider, generateLLMText, getLLMProvider } from './llm';

// Default command: Download and extract CRX to specified directory
export async function processExtension(url: string): Promise<void> {
  // Extract extension ID
  const extensionId = extractExtensionId(url);
  if (!extensionId) {
    throw new Error('Unable to extract extension ID from URL');
  }

  // Temporary CRX file path
  const tempCrxPath = `${extensionId}.crx`;
  // Output directory path
  const outputDir = `output/${extensionId}`;

  try {
    console.log(`Starting to process extension: ${extensionId}`);
    
    // 1. Download CRX file
    console.log('Downloading CRX file...');
    await downloadCrx(url, tempCrxPath);
    
    // 2. Extract to specified directory
    console.log('Extracting files...');
    await unzip(tempCrxPath, undefined, outputDir, false);
    
    // 3. Analyze extracted extension and generate learning plan
    console.log('Analyzing extension structure...');
    await analyzeExtension(outputDir);
    
    console.log(`Extension successfully processed to: ${outputDir}`);
    
  } catch (error) {
    console.error('Error occurred while processing extension:', error);
    throw error;
  } finally {
    // Clean up temporary CRX file
    try {
      const fs = await import('fs');
      if (fs.existsSync(tempCrxPath)) {
        fs.unlinkSync(tempCrxPath);
        console.log('Temporary file cleaned up');
      }
    } catch (cleanupError) {
      console.warn('Error occurred while cleaning up temporary file:', cleanupError);
    }
  }
}

function extractExtensionId(url: string): string | null {
  const match = url.match(/\/([a-z]{32})/i);
  return match ? match[1] : null;
}

export { downloadCrx, unzip, split, normalize, rewrite, analyzeExtension, detectAvailableProvider, generateLLMText, getLLMProvider };
