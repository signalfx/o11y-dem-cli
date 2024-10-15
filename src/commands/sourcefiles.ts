import { Command } from 'commander';

export const sourcefilesCommand = new Command('sourcefiles');

// Define the upload command
sourcefilesCommand
  .command('upload')
  .requiredOption('--app-name <appName>', 'Application name')
  .requiredOption('--app-version <appVersion>', 'Application version')
  .requiredOption('--directory <directory>', 'Path to the directory containing source files')
  .description('Upload source files')
  .action((options) => {
    console.log(`Uploading source files:
      App Name: ${options.appName}
      App Version: ${options.appVersion}
      Directory: ${options.directory}`);
  });
