import fs from "fs/promises"
import path from "path"
import { generateText } from "ai"
import { getLLMProvider } from "./llm"

interface FileInfo {
  name: string;
  path: string;
  size: number;
  type: 'file' | 'directory';
  extension?: string;
  isJavaScript?: boolean;
  isCSS?: boolean;
  isHTML?: boolean;
  isJSON?: boolean;
  isImage?: boolean;
}

interface DirectoryTree {
  name: string;
  path: string;
  type: 'directory';
  children: (DirectoryTree | FileInfo)[];
  totalFiles: number;
  totalSize: number;
}

interface ExtensionAnalysis {
  manifest?: any;
  fileTree: DirectoryTree;
  jsFiles: FileInfo[];
  cssFiles: FileInfo[];
  htmlFiles: FileInfo[];
  jsonFiles: FileInfo[];
  imageFiles: FileInfo[];
  otherFiles: FileInfo[];
  totalFiles: number;
  totalSize: number;
}



async function buildFileTree(dirPath: string, basePath: string = ''): Promise<DirectoryTree> {
  const stats = await fs.stat(dirPath);
  const relativePath = basePath || path.basename(dirPath);
  
  const tree: DirectoryTree = {
    name: path.basename(dirPath),
    path: relativePath,
    type: 'directory',
    children: [],
    totalFiles: 0,
    totalSize: 0
  };

  try {
    const items = await fs.readdir(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const itemRelativePath = basePath ? `${basePath}/${item}` : item;
      const itemStats = await fs.stat(itemPath);
      
      if (itemStats.isDirectory()) {
        const subTree = await buildFileTree(itemPath, itemRelativePath);
        tree.children.push(subTree);
        tree.totalFiles += subTree.totalFiles;
        tree.totalSize += subTree.totalSize;
      } else {
        const fileInfo: FileInfo = {
          name: item,
          path: itemRelativePath,
          size: itemStats.size,
          type: 'file',
          extension: path.extname(item).toLowerCase(),
          isJavaScript: /\.(js|jsx|ts|tsx)$/i.test(item),
          isCSS: /\.css$/i.test(item),
          isHTML: /\.(html|htm)$/i.test(item),
          isJSON: /\.json$/i.test(item),
          isImage: /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(item)
        };
        
        tree.children.push(fileInfo);
        tree.totalFiles += 1;
        tree.totalSize += itemStats.size;
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dirPath}:`, error);
  }

  return tree;
}

function categorizeFiles(tree: DirectoryTree): {
  jsFiles: FileInfo[];
  cssFiles: FileInfo[];
  htmlFiles: FileInfo[];
  jsonFiles: FileInfo[];
  imageFiles: FileInfo[];
  otherFiles: FileInfo[];
} {
  const jsFiles: FileInfo[] = [];
  const cssFiles: FileInfo[] = [];
  const htmlFiles: FileInfo[] = [];
  const jsonFiles: FileInfo[] = [];
  const imageFiles: FileInfo[] = [];
  const otherFiles: FileInfo[] = [];

  function traverse(node: DirectoryTree | FileInfo) {
    if (node.type === 'file') {
      const file = node as FileInfo;
      if (file.isJavaScript) {
        jsFiles.push(file);
      } else if (file.isCSS) {
        cssFiles.push(file);
      } else if (file.isHTML) {
        htmlFiles.push(file);
      } else if (file.isJSON) {
        jsonFiles.push(file);
      } else if (file.isImage) {
        imageFiles.push(file);
      } else {
        otherFiles.push(file);
      }
    } else {
      (node as DirectoryTree).children.forEach(traverse);
    }
  }

  traverse(tree);
  return { jsFiles, cssFiles, htmlFiles, jsonFiles, imageFiles, otherFiles };
}

async function readManifest(outputDir: string): Promise<any | null> {
  try {
    const manifestPath = path.join(outputDir, 'manifest.json');
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    return JSON.parse(manifestContent);
  } catch (error) {
    console.warn('Warning: Could not read manifest.json:', error);
    return null;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function generateFileTreeSummary(analysis: ExtensionAnalysis): string {
  const { fileTree, jsFiles, cssFiles, htmlFiles, jsonFiles, imageFiles, otherFiles } = analysis;
  
  let summary = `# Chrome Extension Analysis\n\n`;
  summary += `## Overview\n`;
  summary += `- **Total Files**: ${analysis.totalFiles}\n`;
  summary += `- **Total Size**: ${formatFileSize(analysis.totalSize)}\n\n`;
  
  if (analysis.manifest) {
    summary += `## Manifest Information\n`;
    summary += `- **Name**: ${analysis.manifest.name || 'Unknown'}\n`;
    summary += `- **Version**: ${analysis.manifest.version || 'Unknown'}\n`;
    summary += `- **Manifest Version**: ${analysis.manifest.manifest_version || 'Unknown'}\n`;
    summary += `- **Description**: ${analysis.manifest.description || 'No description'}\n\n`;
  }
  
  summary += `## File Distribution\n`;
  summary += `- **JavaScript Files**: ${jsFiles.length} (${formatFileSize(jsFiles.reduce((sum, f) => sum + f.size, 0))})\n`;
  summary += `- **CSS Files**: ${cssFiles.length} (${formatFileSize(cssFiles.reduce((sum, f) => sum + f.size, 0))})\n`;
  summary += `- **HTML Files**: ${htmlFiles.length} (${formatFileSize(htmlFiles.reduce((sum, f) => sum + f.size, 0))})\n`;
  summary += `- **JSON Files**: ${jsonFiles.length} (${formatFileSize(jsonFiles.reduce((sum, f) => sum + f.size, 0))})\n`;
  summary += `- **Image Files**: ${imageFiles.length} (${formatFileSize(imageFiles.reduce((sum, f) => sum + f.size, 0))})\n`;
  summary += `- **Other Files**: ${otherFiles.length} (${formatFileSize(otherFiles.reduce((sum, f) => sum + f.size, 0))})\n\n`;
  
  // Key files to highlight
  summary += `## Key Files\n`;
  if (jsFiles.length > 0) {
    summary += `### JavaScript Files:\n`;
    jsFiles.slice(0, 10).forEach(file => {
      summary += `- \`${file.path}\` (${formatFileSize(file.size)})\n`;
    });
    if (jsFiles.length > 10) {
      summary += `- ... and ${jsFiles.length - 10} more\n`;
    }
    summary += `\n`;
  }
  
  if (htmlFiles.length > 0) {
    summary += `### HTML Files:\n`;
    htmlFiles.forEach(file => {
      summary += `- \`${file.path}\` (${formatFileSize(file.size)})\n`;
    });
    summary += `\n`;
  }
  
  return summary;
}

export async function analyzeExtension(outputDir: string): Promise<void> {
  console.log('🔍 Starting extension analysis...');
  
  try {
    // Build file tree
    console.log('📂 Building file tree...');
    const fileTree = await buildFileTree(outputDir);
    
    // Read manifest
    console.log('📋 Reading manifest...');
    const manifest = await readManifest(outputDir);
    
    // Categorize files
    console.log('📊 Categorizing files...');
    const categorizedFiles = categorizeFiles(fileTree);
    
    const analysis: ExtensionAnalysis = {
      manifest,
      fileTree,
      ...categorizedFiles,
      totalFiles: fileTree.totalFiles,
      totalSize: fileTree.totalSize
    };
    
    // Generate file tree summary
    const summary = generateFileTreeSummary(analysis);
    console.log('📄 Generated file tree summary');
    
    // Use AI to create learning plan
    console.log('🤖 Generating AI learning plan...');
    await generateLearningPlan(analysis, summary, outputDir);
    
    console.log('✅ Extension analysis completed!');
    
  } catch (error) {
    console.error('❌ Error during extension analysis:', error);
    throw error;
  }
}

async function generateLearningPlan(analysis: ExtensionAnalysis, summary: string, outputDir: string): Promise<void> {
  try {
    const { model, provider } = getLLMProvider();
    
    const prompt = `You are an expert Chrome extension reverse engineer and educator. I've extracted and analyzed a Chrome extension, and I need you to create a comprehensive learning plan based on the extracted file structure and content.

Here's the analysis of the Chrome extension:

${summary}

## Input
- **Extension Directory**: A complete unzipped Chrome extension folder structure
- **Analysis Goal**: Generate a step-by-step action plan to convert the extension to readable code

## Analysis Framework

### Phase 1: Directory Structure Analysis
1. **Manifest Analysis**
   - Locate and parse manifest.json (v2 or v3)
   - Extract extension metadata, permissions, and entry points
   - Identify content scripts, background scripts, popup scripts
   - Note any web_accessible_resources or externally_connectable domains

2. **File Inventory**
   - Catalog all JavaScript files (.js)
   - Identify CSS files and their purposes
   - List HTML files (popup, options, content pages)
   - Note any JSON configuration files
   - Identify asset files (images, fonts, etc.)

3. **Code Structure Assessment**
   - Detect minification patterns (single-line code, shortened variable names)
   - Identify obfuscation techniques (string encoding, control flow flattening)
   - Check for source maps (.map files)
   - Analyze bundling patterns (webpack, rollup, etc.)

### Phase 2: Dependency Analysis
1. **External Libraries**
   - Identify included third-party libraries
   - Check for CDN references or bundled dependencies
   - Note any custom frameworks or utilities

2. **Internal Architecture**
   - Map communication between components (content scripts ↔ background ↔ popup)
   - Identify message passing patterns
   - Note storage usage (chrome.storage, localStorage)

### Phase 3: Action Plan Generation

Generate a detailed action plan with these sections:

#### 📋 **PREPARATION STEPS**
- List required tools (beautifiers, deobfuscators, etc.)
- Backup original files
- Set up development environment

#### 🔍 **CODE RESTORATION PRIORITY**
Rank files by importance:
1. **Critical Path Files**: manifest.json, main background/content scripts
2. **UI Components**: popup, options pages
3. **Supporting Files**: utilities, configuration files
4. **Assets**: CSS, images, localization files

#### 🛠 **RESTORATION TECHNIQUES**
For each identified file type, specify:
- **Beautification**: Tool recommendations (Prettier, JS Beautify)
- **Deobfuscation**: Specific techniques needed
- **Variable Renaming**: Strategy for meaningful names
- **Comment Recovery**: Where to add explanatory comments
- **Modularization**: How to split monolithic files

#### 📝 **DOCUMENTATION REQUIREMENTS**
- README.md with extension overview
- API documentation for custom functions
- Configuration guide
- Development setup instructions

#### ✅ **VERIFICATION STEPS**
- Code syntax validation
- Functional testing procedures
- Performance comparison with original
- Security review checklist

## Output Format

<markdown>
# Chrome Extension Recovery Action Plan
## Extension: [Name from manifest]
## Version: [Version from manifest]

### 🎯 EXECUTIVE SUMMARY
[Brief overview of the extension's purpose and complexity]

### 📊 ANALYSIS RESULTS
**Complexity Level**: [Low/Medium/High]
**Obfuscation Detected**: [Yes/No - with details]
**Source Maps Available**: [Yes/No]
**Estimated Recovery Time**: [Hours/Days]

### 🔧 DETAILED ACTION PLAN
[Step-by-step numbered plan with specific tools and techniques]

### ⚠️ POTENTIAL CHALLENGES
[List of anticipated difficulties and mitigation strategies]

### 📚 REQUIRED RESOURCES
[Tools, documentation, and expertise needed]
<markdown>

## Analysis Guidelines

1. **Be Thorough**: Examine every file for clues about the original structure
2. **Prioritize Functionality**: Focus on restoring working code first, aesthetics second
3. **Preserve Behavior**: Ensure the recovered code maintains original functionality
4. **Security Conscious**: Note any suspicious patterns or potential security issues
5. **Tool Recommendations**: Suggest specific tools for each restoration task
6. **Realistic Timeline**: Provide honest estimates for completion time

## Special Considerations

- **Webpack Bundles**: Look for chunk mappings and entry points
- **TypeScript Origins**: Check for .d.ts files or TS compilation artifacts
- **React/Vue Components**: Identify component hierarchies
- **API Keys/Secrets**: Flag any embedded credentials that need secure handling
- **Licensing**: Note any license headers or attribution requirements

Begin your analysis by examining the manifest.json file and overall directory structure, then proceed systematically through each phase.`;

    const { text } = await generateText({
      model,
      prompt,
      maxTokens: 16000,
      temperature: 0.3,
    });

    // Save the learning plan
    const learningPlanPath = path.join(outputDir, 'LEARNING_PLAN.md');
    const fullReport = `# Chrome Extension Learning Plan\n\n${text}\n\n---\n\n${summary}`;
    
    await fs.writeFile(learningPlanPath, fullReport);
    console.log(`📚 Learning plan saved to: ${learningPlanPath}`);
    
    // Also save the analysis summary
    const analysisPath = path.join(outputDir, 'ANALYSIS_SUMMARY.md');
    await fs.writeFile(analysisPath, summary);
    console.log(`📊 Analysis summary saved to: ${analysisPath}`);
    
  } catch (error) {
    console.error('❌ Error generating learning plan:', error);
    // Don't throw here - we want the analysis to complete even if AI fails
    console.log('⚠️  Continuing without AI-generated learning plan');
  }
}