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

import axios, { AxiosError } from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import { createLogger, LogLevel } from '../utils/logger';

interface FileUpload {
  filePath: string;
  fieldName: string;
}

interface UploadOptions {
  url: string;
  file: FileUpload;
  parameters: { [key: string]: string | number }; 
  onProgress?: (progressInfo: { progress: number; loaded: number; total: number }) => void;
}

interface GetOptions { // exact format of get tbd, and unsure if all these will apply to all methods that call getData
  url: string;
  params?: { [key: string]: any }; 
  headers?: { [key: string]: string }; 
  logger?: any; 
  logLevel?: string; 
}

export interface ProgressInfo {
  progress: number;
  loaded: number;
  total: number;
}

// This uploadFile method will be used by all the different commands that want to upload various types of
// symbolication files to o11y cloud. The url, file, and additional parameters are to be prepared by the
// calling method. Various errors, Error, axiosErrors and all should be handled by the caller of this method.
// Since the API contracts with the backend are not yet determined. This is subject to change

export const uploadFile = async ({ url, file, parameters, onProgress }: UploadOptions): Promise<void> => {
  const formData = new FormData();

  formData.append(file.fieldName, fs.createReadStream(file.filePath));

  for (const [ key, value ] of Object.entries(parameters)) {
    formData.append(key, value);
  }

  const fileSizeInBytes = fs.statSync(file.filePath).size;

  await axios.post(url, formData, {
    headers: {
      ...formData.getHeaders(),
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

export const getData = async ({ url, params, headers, logger, logLevel = 'info' }: GetOptions): Promise<any> => {
  try {
    if (logger) {
      logger[logLevel](`Fetching mapping file data`);
    }

    const response = await axios.get(url, { // unsure of format or if we need this
      params,   
      headers,  
    });

    if (logger) {
      logger[logLevel](`Received response: ${JSON.stringify(response.data)}`);
    }

    return response.data;  // Return the response data (the list of uploaded files)
  } catch (error) {
    if (logger) {
      const e = error as Error;  
      logger.error(`Error fetching data: ${e.message}`);
    }
    throw new Error('Failed to fetch data from the server.');
  }
};