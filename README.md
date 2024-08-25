# URCRX

URCRX = Unroll Chrome Extension

Set of tools to reverse engineer a chrome extension from the crx file.

一套工具链，从 chrome extension 的crx文件中恢复出可读的代码仓库。

Coding with cursor editor.

## Usage

copy .env.example to .env and fill ANTHROPIC_API_KEY.

```
urcrx download <extension-url>
urcrx unzip /path/to/{entrypoint}.js
urcrx process /path/to/{entrypoint-unzipped}.js
urcrx split /path/to/{entrypoint-processed}.js
urcrx rewrite /path/to/{compressed-code}.js
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
- [ ] bug: fix relative path issue, ex. `import mod from './mod.js'`
- [ ] feature: record token usage and set limitation
- [ ] feature: one command to run all
- [ ] feature: integrate more LLM
- [ ] feature: automatically generate the codebase readme and implementation details
- [ ] feature: make the recovered code base chatable
