# URCRX - Chrome Extension Reverse Engineering Tool

URCRX (Unroll Chrome Extension) is a CLI tool for reverse engineering Chrome extensions from CRX files. The project helps extract, process, analyze, and make readable the compressed/minified code found in Chrome extension packages.

## Features

- **Download**: Download Chrome extension CRX files from URLs
- **Extract**: Unzip and extract extension contents 
- **Split**: Split large bundled JavaScript files
- **Normalize**: Normalize and beautify code
- **Rewrite**: Use AI to rewrite compressed code into readable format
- **Analyze**: 🆕 Analyze extension structure and generate AI-powered learning plans

## Installation

```bash
# Using Bun (recommended)
bun install

# Using npm
npm install
```

## Usage

### Default Processing Command (with Analysis)
```bash
# Download, extract, and analyze a Chrome extension
urcrx <chrome-web-store-url>

# This will:
# 1. Download the CRX file
# 2. Extract all contents
# 3. Beautify JavaScript files  
# 4. Analyze the extension structure
# 5. Generate an AI learning plan
```

### Individual Commands

```bash
# Download extension CRX file
urcrx download <url>

# Extract CRX file
urcrx unzip <path> [--entrypoint <file>] [--inspect]

# Split bundled files
urcrx split --path <path> [--search <pattern>]

# Normalize code formatting  
urcrx normalize --path <path>

# AI-powered code rewriting
urcrx rewrite --path <path>

# Analyze extension structure (NEW!)
urcrx analyze --path <extension-directory>
```

## AI Analysis Features

The new analysis feature provides:

- **File Tree Analysis**: Complete directory structure analysis
- **Manifest Parsing**: Extension metadata and permissions analysis
- **File Categorization**: Automatic categorization of JS, CSS, HTML, JSON, and image files
- **Learning Plan Generation**: AI-generated comprehensive learning plan
- **Security Insights**: Recommendations for security analysis
- **Study Roadmap**: Step-by-step guidance for understanding the extension

### AI Provider Setup

Set up your AI provider API key:

```bash
# Anthropic Claude (recommended for analysis)
export ANTHROPIC_API_KEY="your_key_here"

# Or OpenAI GPT-4
export OPENAI_API_KEY="your_key_here"
```

## Output Structure

After processing, extensions are extracted to `output/<extension-id>/` with:

- Original extension files (beautified)
- `ANALYSIS_SUMMARY.md` - Detailed file structure analysis
- `LEARNING_PLAN.md` - AI-generated learning and analysis plan

## Examples

```bash
# Process a popular extension with full analysis
urcrx https://chrome.google.com/webstore/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm

# Only analyze an already extracted extension
urcrx analyze --path ./output/cjpalhdlnbpafiamejdnhcphjbkeiagm

# Extract with inspection only (no files written)
urcrx unzip extension.crx --inspect
```

## Tech Stack

- **Runtime**: Bun (recommended) or Node.js
- **Language**: TypeScript with ES modules  
- **CLI Framework**: Commander.js
- **AI Integration**: Modular AI SDK with multi-provider support (Anthropic Claude 3.5 Sonnet, OpenAI GPT-4o)
- **Code Processing**: js-beautify for formatting, yauzl for ZIP extraction
- **Architecture**: Clean separation of concerns with dedicated LLM provider module

## Development

```bash
# Build the project
bun run build

# The CLI uses the built files in ./dist/
```

## License

MIT
