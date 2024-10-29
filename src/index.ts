#!/usr/bin/env node

/* eslint-disable header/header */

/*
 * Copyright Splunk Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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

program.parseAsync(process.argv);
