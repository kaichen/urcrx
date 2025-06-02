// ECMAScript (.mjs)
import { Command } from 'commander';
import { downloadCrx, unzip, split, normalize, rewrite, analyzeExtension, processExtension } from './dist/index.js';
const program = new Command();

// Default command: Process CRX URL
program
  .argument('[url]', 'Chrome extension URL')
  .description('Download and extract Chrome extension to output/$id directory')
  .action(async (url) => {
    if (url) {
      await processExtension(url);
    } else {
      program.help();
    }
  });

program.command('download <url>')
  .description('download extension')
  .action(async (url, options) => {
    await downloadCrx(url);
  });

program.command('unzip <path>')
  .description('unzip extension')
  .option('-e, --entrypoint <entrypoint>', 'entrypoint path')
  .option('-i, --inspect', 'only show file tree without extracting')
  .action(async (path, options) => {
    await unzip(path, options.entrypoint, 'output', options.inspect);
  });

program.command('split')
  .description('split extension')
  .option('-p, --path <path>', 'extension file path')
  .option('-s, --search <pattern>', 'search pattern')
  .action(async (options) => {
    await split(options.path, options.search);
  });

program.command('normalize')
  .description('split extension')
  .option('-p, --path <path>', 'extension file path')
  .action(async (options) => {
    await normalize(options.path);
  });

program.command('rewrite')
  .description('rewrite source code file to readable format')
  .option('-p, --path <path>', 'extension file path')
  .action(async (options) => {
    await rewrite(options.path);
  });

program.command('analyze')
  .description('analyze extension structure and generate learning plan')
  .option('-p, --path <path>', 'extension directory path')
  .action(async (options) => {
    await analyzeExtension(options.path);
  });

program.parse(process.argv);
