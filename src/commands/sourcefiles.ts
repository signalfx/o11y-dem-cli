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

export const sourcefilesCommand = new Command('sourcefiles');

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
