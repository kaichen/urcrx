// ECMAScript (.mjs)
import { Command } from 'commander';
import { downloadCrx, unzip, split, normalize, rewrite } from './dist/index.js';
const program = new Command();

program.command('download')
  .description('download extension')
  .option('--url <url>', 'extension url')
  .action(async (options) => {
    await downloadCrx(options.url);
  });

program.command('unzip')
  .description('unzip extension')
  .option('-p, --path <path>', 'extension file path')
  .option('-e, --entrypoint <entrypoint>', 'entrypoint path')
  .action(async (options) => {
    await unzip(options.path, options.entrypoint);
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

program.parse(process.argv);
