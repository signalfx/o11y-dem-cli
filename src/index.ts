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
import { iOSCommand } from './commands/ios';
import { androidCommand } from './commands/android';
import { sourcemapsCommand } from './commands/sourcemaps';

const program = new Command();

const helpDescription =
`A CLI tool for uploading and displaying of Android, iOS, and Browser symbolication files to and from Splunk O11y Cloud.

For each respective command listed below under 'Commands', please run 'o11y-dem-cli <command>' for an overview of available subcommands and options.

For subcommands like "upload" and "list" that make an API call, please ensure that the realm and token are either passed into the command as options, or set using the environment variables SPLUNK_REALM and SPLUNK_ACCESS_TOKEN.
`;

program
  .version('1.0.0')
  .description(helpDescription)
  .name('o11y-dem-cli')
  .usage('[command] [subcommand] [options]');
  
program.addCommand(iOSCommand);
program.addCommand(androidCommand);
program.addCommand(sourcemapsCommand);

program.parseAsync(process.argv);
