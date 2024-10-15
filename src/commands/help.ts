import { Command } from 'commander';

export const helpCommand = new Command('help')
  .description('Display help information')
  .action(() => {
    console.log(`O11Y DEM CLI`);
    console.log(`\nUsage:\n  o11y-dem-cli <command> [options]`);
    
    console.log(`\nCommands:`);
    console.log(`  ios <command>               Manage iOS mapping files`);
    console.log(`    upload --file <file>      Upload an iOS dSYM file`);
    
    console.log(`  android <command>           Manage Android mapping files`);
    console.log(`    upload --app-id <appId> --version-code <versionCode> --file <file> [--uuid <uuid>]`);
    console.log(`    upload-with-manifest --manifest <manifest> --file <file>`);
    
    console.log(`  sourcemaps <command>        Manage source maps`);
    console.log(`    inject --directory <directory>`);
    console.log(`    upload --app-name <appName> --app-version <appVersion> --directory <directory>`);
    
    console.log(`  sourcefiles <command>       Manage source files`);
    console.log(`    upload --app-name <appName> --app-version <appVersion> --directory <directory>`);

    console.log(`\nGlobal Options:`);
    console.log(`  -h, --help                  Display help information`);
    console.log(`  -v, --version               Show the version of the CLI`);
    
    console.log(`\nFor more information, please refer to the documentation or visit our website.`);
  });
