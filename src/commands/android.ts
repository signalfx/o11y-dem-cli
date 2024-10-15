import { Command } from 'commander';

export const androidCommand = new Command('android');

androidCommand
  .command('upload')
  .description('Upload an Android mapping file')
  .requiredOption('--app-id <appId>', 'Application ID')
  .requiredOption('--version-code <versionCode>', 'Version code')
  .requiredOption('--file <file>', 'Path to the mapping file')
  .option('--uuid <uuid>', 'Optional UUID for the upload')
  .action((options) => {
    console.log(`Uploading Android mapping file:
      App ID: ${options.appId}
      Version Code: ${options.versionCode}
      File: ${options.file}
      UUID: ${options.uuid || 'Not provided'}`);
  });
  
androidCommand
  .command('upload-with-manifest')
  .description('Upload an Android mapping file with a manifest')
  .requiredOption('--manifest <manifest>', 'Path to the packaged AndroidManifest.xml file')
  .requiredOption('--file <file>', 'Path to the mapping.txt file')
  .action((options) => {
    console.log(`Uploading Android mapping file with manifest:
      Manifest: ${options.manifest}
      File: ${options.file}`);
  });
