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

import fs from 'fs';
import path from 'path';

export const COMMON_ERROR_MESSAGES = {
  TOKEN_NOT_SPECIFIED: 'Error: API access token is required. Please pass it into the command as the --token option, or set using the environment variable SPLUNK_ACCESS_TOKEN',
  REALM_NOT_SPECIFIED: 'Error: Realm is required and cannot be empty. Please pass it into the command as the --realm option, or set using the environment variable SPLUNK_REALM',
  HELP_MESSAGE_AFTER_ERROR: `\nRun the command with '--help' for more information`
};

// Check if a file exists
export const isValidFile = (filePath: string): boolean => {
  return fs.existsSync(filePath);
};

// Check if a file has correct extension type
export const hasValidExtension = (filePath: string, ...expectedExtensions: string[]): boolean => {
  const ext = path.extname(filePath);
  return expectedExtensions.includes(ext);
};
// Validate applicationID (should be a non-empty string)
export const isValidAppId = (appId: unknown): appId is string => {
  return typeof appId ===  'string' && appId.length > 0;
};

// Validate app versionCode (should be an integer or a string representation of a integer)
export const isValidVersionCode = (versionCode: unknown): boolean => {
  return typeof versionCode === 'number' && Number.isInteger(versionCode) || 
  (typeof versionCode === 'string' && Number.isInteger(Number(versionCode)));
};

// Validate Splunk Build ID (should be a string)
export const isValidSplunkBuildId = (splunkBuildId: unknown | undefined): boolean => {
  return splunkBuildId !== undefined && typeof splunkBuildId === 'string' && splunkBuildId.length > 0;
};
