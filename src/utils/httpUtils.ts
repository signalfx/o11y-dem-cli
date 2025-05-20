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

import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import { AndroidMappingMetadata } from './metadataFormatUtils';

interface FileUpload {
  filePath: string;
  fieldName: string;
}

interface UploadOptions {
  url: string;
  file: FileUpload;
  token?: string;
  parameters: { [key: string]: string | number };
  onProgress?: (progressInfo: { progress: number; loaded: number; total: number }) => void;
}

export interface FetchAndroidMetadataOptions {
  url: string;
  token: string;
  axiosInstance?: AxiosInstance;
}

export interface ProgressInfo {
  progress: number;
  loaded: number;
  total: number;
}

const TOKEN_HEADER = 'X-SF-Token';

export type ErrorHandlingResult = {
  category: ErrorCategory;
};

export enum ErrorCategory {
  RequestEntityTooLarge = 'REQUEST_ENTITY_TOO_LARGE',
  NetworkIssue = 'NETWORK_ISSUE',
  NoResponse = 'NO_RESPONSE',
  GeneralHttpError = 'GENERAL_HTTP_ERROR',
  Unexpected = 'UNEXPECTED',
}

// Helper interface for the 'data' object within error.details
export interface DetailDataObject {
  code?: string;
  // Can add other known optional properties here, e.g., error?: string;
  [key: string]: unknown;
}

export interface StandardError {
  type: ErrorCategory;
  message: string;
  details?: {
    status?: number; // http status code
    data?: DetailDataObject | string;
    url?: string; // url that was attempted
  };
  userFriendlyMessage: string;
}

export function formatCLIErrorMessage(error: StandardError): string {
  const entryIndent = '   ';
  const detailEntries: string[] = [];

  // core technical message
  detailEntries.push(`${entryIndent}"message": "${error.message}"`);

  // attempted url if available
  if (error.details?.url) {
    detailEntries.push(`${entryIndent}"url": "${error.details.url}"`);
  }

  // http status code if available
  if (error.details?.status !== undefined) {
    detailEntries.push(`${entryIndent}"status": ${error.details.status}`);
  }

  // codes from error.details.data (e.g., 'ENOTFOUND') if available
  if (error.details?.data) {
    const data = error.details.data; // data is now DetailDataObject | string | undefined

    // Check if data is an object (and not null) before trying to access properties
    if (typeof data === 'object' && data !== null) {
      // Safely check if 'code' property exists and is a string
      if ('code' in data && typeof data.code === 'string') {
        detailEntries.push(`${entryIndent}"code": "${data.code}"`);
      }
      // can add other fields from data if needed, e.g.:
      // if ('someOtherField' in data && typeof data.someOtherField === 'expectedType') {
      //   detailEntries.push(`${entryIndent}"someOtherField": "${data.someOtherField}"`);
      // }
    }
    else if (typeof data === 'string') {
      detailEntries.push(`${entryIndent}"responseData": "${data}"`);
    }
  }

  const detailsBlockContent = detailEntries.length > 0 ? `\n${detailEntries.join(',\n')}\n` : '';
  const detailsBlock = `details: [${detailsBlockContent}]`;

  return `Error: ${error.userFriendlyMessage}\n${detailsBlock}`;
}

export const fetchAndroidMappingMetadata = async ({ 
  url, 
  token, 
  axiosInstance 
}: FetchAndroidMetadataOptions): Promise<AndroidMappingMetadata[]> => {  const headers = {
  'X-SF-Token': token,
  'Accept': 'application/json',
};

try {
  const client = axiosInstance || axios;
  const response = await client.get<AndroidMappingMetadata[]>(url, { headers });
  return response.data;
} catch (error) {
  if (axios.isAxiosError(error)) {
    throw new Error(`HTTP ${error.response?.status}: ${error.response?.statusText}\nResponse Data: ${JSON.stringify(error.response?.data, null, 2)}`);
  } else {
    throw error;
  }
}
};

// This uploadFile method will be used by all the different commands that want to upload various types of
// symbolication files to o11y cloud. The url, file, and additional parameters are to be prepared by the
// calling method. Various errors, Error, axiosErrors and all should be handled by the caller of this method.
// Since the API contracts with the backend are not yet determined. This is subject to change

export const uploadFile = async ({ url, file, token, parameters, onProgress }: UploadOptions, axiosInstance?: AxiosInstance): Promise<void> => {
  const formData = new FormData();

  formData.append(file.fieldName, fs.createReadStream(file.filePath));

  for (const [ key, value ] of Object.entries(parameters)) {
    formData.append(key, value);
  }

  const fileSizeInBytes = fs.statSync(file.filePath).size;

  await (axiosInstance || axios).put(url, formData, {
    headers: {
      ...formData.getHeaders(),
      [TOKEN_HEADER]: token,
    },
    onUploadProgress: (progressEvent) => {
      const loaded = progressEvent.loaded;
      const total = progressEvent.total || fileSizeInBytes;
      const progress = (loaded / total) * 100;
      if (onProgress) {
        onProgress({ progress, loaded, total });
      }    
    },
  });
};

// temporary function
// mockUploadFile can be used when the endpoint for the real uploadFile call is not ready

export const mockUploadFile = async ({ file, onProgress }: UploadOptions): Promise<void> => {
  const fileSizeInBytes = fs.statSync(file.filePath).size;

  return new Promise((resolve) => {
    const mbps = 25;
    const bytes_to_megabits = (bytes: number) => bytes * 8 / 1000 / 1000;

    // simulate axios progress events
    const tick = 50;
    let msElapsed = 0;
    const intervalId = setInterval(() => {
      msElapsed += tick;
      const loaded = Math.floor((msElapsed / 1000) * mbps / 8 * 1024 * 1024);
      const total = fileSizeInBytes;
      const progress = (loaded / total) * 100;
      onProgress?.({ loaded, total, progress });
    }, tick);

    // simulate axios completion
    setTimeout(() => {
      clearInterval(intervalId);
      resolve();
    }, bytes_to_megabits(fileSizeInBytes) / mbps * 1000);
  });
};
