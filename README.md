# URCRX

URCRX = Unroll Chrome Extension

Set of tools to reverse engineer a chrome extension from the crx file.

一套工具链，从 chrome extension 的crx文件中恢复出可读的代码仓库。

Coding with cursor editor.

## Usage

copy .env.example to .env and fill ANTHROPIC_API_KEY.

### Quick Start (Default Command)

```bash
# Provide Chrome extension URL directly, automatically download and extract to output/$id directory
urcrx https://chrome.google.com/webstore/detail/extension-id/abcdefghijklmnopqrstuvwxyz123456
```

## Development

Recommend uses [Bun](https://bun.sh) as a fast all-in-one JavaScript runtime.

To install dependencies:

```bash
bun install
bun run build
bun run ./cli.js
```

## TODOs
- [x] feature: one command to run all
- [ ] bug: fix relative path issue, ex. `import mod from './mod.js'`
- [ ] feature: record token usage and set limitation
- [ ] feature: integrate more LLM
- [ ] feature: automatically generate the codebase readme and implementation details
- [ ] feature: make the recovered code base chatable

## License

MIT License

Copyright (c) 2024 URCRX

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
