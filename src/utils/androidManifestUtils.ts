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

import { parseStringPromise } from 'xml2js';
import fs from 'fs';
import { throwAsUserFriendlyErrnoException } from './userFriendlyErrors'; 

interface ManifestData {
  package: string;
  versionCode: string;
  uuid?: string;
}

export const extractManifestData = async (manifestPath: string): Promise<ManifestData> => {
  try {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const result = await parseStringPromise(manifestContent);

    const packageId = result.manifest.$.package;
    const versionCode = result.manifest.$['android:versionCode'];
    const uuid = result.manifest.application[0]['meta-data']?.find((meta: { $: { [key: string]: string } }) => meta.$['android:name'] === 'SPLUNK_O11Y_CUSTOM_UUID')?.$['android:value'];

    return {
      package: packageId,
      versionCode,
      uuid,
    };
  } catch (error: unknown) {
    const fileMessages = {
      EACCES: `Failed to access the manifest file "${manifestPath}" due to missing permissions.\nMake sure that the CLI tool has "read" access to the file.`,
      ENOENT: `The manifest file "${manifestPath}" does not exist.\nMake sure the correct path is being passed to --manifest.`,
      ENOTDIR: `The path "${manifestPath}" is not a valid manifest file.\nEnsure you are providing a path to a valid AndroidManifest.xml.`,
    };
    
    throwAsUserFriendlyErrnoException(error, fileMessages);
  }
};
