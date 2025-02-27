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


/*
 * Example usage of the ensureEnvVariable function:
 * 
 * This function checks for the presence of the specified environment variable.
 * If the variable is missing, it either logs an error or a warning based on the 'onMissing' parameter.
 * 
 * Parameters:
 * - variableName: The name of the environment variable to check.
 * - onMissing: Determines the action to take if the variable is missing. Options are 'error' or 'warn'.
 * 
 * Example:
 *
 * import { ensureEnvVariable } from '../utils/environment.ts';
 *
 * ensureEnvVariable({
 *   variableName: 'SPLUNK_O11Y_TOKEN',
 *   onMissing: 'error', // Choose 'error' to log an error or 'warn' to log a warning if the variable is missing.
 * });
 */
 

// Export in case needed, but not needed if call puts values inline
export interface EnvCheckOptions {
  variableName: string; // The name of the environment variable to check
  onMissing: 'error' | 'warn'; // Action to take if the variable is missing
}

// Check that `variableName` environment variable is set, and warn or error depending on 'onMissing'.
export function ensureEnvVariable({
  variableName,
  onMissing,
}: EnvCheckOptions): void {
  const variableValue = process.env[variableName]; // Retrieve the variable value using variableName
  const missingVars = [];

  if (!variableValue) missingVars.push(variableName);

  if (missingVars.length > 0) {
    const message = `Missing environment variable(s): ${missingVars.join(', ')}. Please set before running this command.`;
    if (onMissing === 'error') {
      console.error(`Error: ${message}`);
      process.exit(1);
    } else if (onMissing === 'warn') {
      console.warn(`Warning: ${message}`);
      process.exit(0);
    }
  }
}

