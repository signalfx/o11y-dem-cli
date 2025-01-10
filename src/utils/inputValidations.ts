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

// Check if a file exists
export const isValidFile = (filePath: string): boolean => {
  return fs.existsSync(filePath);
};

// Check if a file has correct extension type
export const hasValidExtension = (filePath: string, expectedExtension: string): boolean => {
  const ext = path.extname(filePath);
  return ext === expectedExtension;
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

// Validate UUID (should be a string)
export const isValidUUID = (uuid: unknown | undefined): boolean => {
  return uuid !== undefined && typeof uuid === 'string' && uuid.length > 0;
};
