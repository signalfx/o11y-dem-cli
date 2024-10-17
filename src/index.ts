#!/usr/bin/env node

import { Command } from 'commander';
import { iosCommand } from './commands/ios';
import { androidCommand } from './commands/android';
import { sourcemapsCommand } from './commands/sourcemaps';
import { sourcefilesCommand } from './commands/sourcefiles';

const program = new Command();

program
  .version('1.0.0')
  .description('A CLI Tool to allow uploading of Android, iOS, and Browser symbolication files to Splunk O11y Cloud');

program.addCommand(iosCommand);
program.addCommand(androidCommand);
program.addCommand(sourcemapsCommand);
program.addCommand(sourcefilesCommand);

program.parse(process.argv);
