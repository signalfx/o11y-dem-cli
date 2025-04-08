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

export interface AndroidMappingMetadata {
  id: number;
  orgId: number;
  appId: string;
  appVersion: number;
  createdOnMs: number;
  updatedOnMs: number;
  preprocessedVersion?: number;
  fileUri: string;
  createdBy?: number;
  updatedBy?: number;
  r8MappingFileFormatVersion?: string;
  fileSize?: number;
}
  
export function formatAndroidMappingMetadata(metadataList: AndroidMappingMetadata[]): string {
  if (!metadataList || metadataList.length === 0) {
    return 'No mapping files found.';
  }
  
  // Create formatted table-like output
  const formattedOutput = metadataList.map(item => {

    // Make timestamps readable
    const uploadDate = new Date(item.createdOnMs).toLocaleString();
      
    // Format each item
    return `
        ID: ${item.id}
        App: ${item.appId} (Version: ${item.appVersion})
        Uploaded: ${uploadDate}
        File Size: ${formatFileSize(item.fileSize)}
        Format Version: ${item.r8MappingFileFormatVersion || 'N/A'}
        File URI: ${item.fileUri}
        `;
  }).join('\n' + '-'.repeat(50) + '\n');
  
  const summary = `Found ${metadataList.length} mapping file(s):\n` + '='.repeat(50);
    
  return summary + '\n' + formattedOutput;
}
  
function formatFileSize(bytes?: number): string {
  if (bytes === undefined) return 'Unknown';
    
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
    
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
    
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}