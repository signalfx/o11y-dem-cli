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

interface UploadOptions {
  url: string;
  file: { [key: string]: string };
  parameters: { [key: string]: any }; 
  onProgress: (progress: number) => void;
}

// This uploadFile method will be used by all the different commands that want to upload various types of
// symbolication files to o11y cloud. The url, file, and additional parameters are to be prepared by the
// calling method. Since the API contracts with the backend are not yet determined. This is subject to change

export const uploadFile = async ({ url, file, parameters, onProgress }: UploadOptions): Promise<void> => {
  try {
    const formData = new FormData();

    // Append files to FormData
    for (const [fieldName, filePath] of Object.entries(file)) {
      formData.append(fieldName, fs.createReadStream(filePath));
    }

    // Append additional parameters
    for (const [key, value] of Object.entries(parameters)) {
      formData.append(key, value);
    }

    const fileSizeInBytes = fs.statSync(Object.values(file)[0]).size;

    const response = await axios.post(url, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / fileSizeInBytes);
        onProgress(progress);
      },
    });

    console.log('Upload successful:', response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('Axios error message:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        console.error('Request data:', error.request);
      }
    } else if (error instanceof Error) {
      console.error('Unexpected error:', error.message);
    } else {
      console.error('Unknown error:', error);
    }
  }
};