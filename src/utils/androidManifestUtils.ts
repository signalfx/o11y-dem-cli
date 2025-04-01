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
import { throwAsUserFriendlyErrnoException, UserFriendlyError } from './userFriendlyErrors'; 

interface ManifestData {
  package: unknown;
  versionCode: unknown;
  splunkBuildId?: unknown;
}

export const extractManifestData = async (manifestPath: string): Promise<ManifestData> => {
  try {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const result = await parseStringPromise(manifestContent);

    const packageId = extractPackageId(result);
    const versionCode = extractVersionCode(result);
    const splunkBuildId = extractSplunkBuildId(result);

    return {
      package: packageId,
      versionCode,
      splunkBuildId,
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

/* eslint-disable */
const extractPackageId = (manifest: any): unknown => {
  try {
    return manifest.manifest.$.package;
  } catch (error) {
    throw new UserFriendlyError(error, "Failed to extract packageId from the manifest.");
  }
};

/* eslint-disable */
const extractVersionCode = (manifest: any): unknown => {
  try {
    return manifest.manifest.$['android:versionCode'];
  } catch (error) { 
    throw new UserFriendlyError(error, 'Failed to extract versionCode from the manifest.');
  }
};

/* eslint-disable */
const extractSplunkBuildId = (manifest: any): unknown => {
  const metaData = manifest.manifest.application[0]['meta-data'];
  if (!metaData) return undefined;

  const splunkBuildIdMeta = metaData.find((meta: { $: { [key: string]: string } }) =>
    meta.$['android:name'] === 'splunk.build_id'
  );

  return splunkBuildIdMeta ? splunkBuildIdMeta.$['android:value'] : undefined;
};
