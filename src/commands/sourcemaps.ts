import { Command } from 'commander';

export const sourcemapsCommand = new Command('sourcemaps');

sourcemapsCommand
  .command('inject')
  .requiredOption('--directory <directory>', 'Path to the directory for injection')
  .description('Inject source maps into the specified directory')
  .action((options) => {
    console.log(`Injecting source maps into directory: ${options.directory}`);
  });

sourcemapsCommand
  .command('upload')
  .requiredOption('--app-name <appName>', 'Application name')
  .requiredOption('--app-version <appVersion>', 'Application version')
  .requiredOption('--directory <directory>', 'Path to the directory containing source maps')
  .description('Upload source maps')
  .action((options) => {
    console.log(`Uploading source maps:
      App Name: ${options.appName}
      App Version: ${options.appVersion}
      Directory: ${options.directory}`);
  });
