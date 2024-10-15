import { Command } from 'commander';

export const iosCommand = new Command('ios');

iosCommand
  .command('upload')
  .description('Upload an iOS dSYM file')
  .requiredOption('--file <file>', 'Path to the dSYM file')
  .action((options) => {
    console.log(`Uploading iOS dSYM file from: ${options.file}`);
  });
