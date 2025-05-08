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
*/

import axios, { AxiosInstance } from 'axios';
import { uploadFile } from '../utils/httpUtils';
import { TOKEN_HEADER, IOS_CONSTANTS } from '../utils/constants';
import { generateUrl } from './iOSdSYMUtils';
import { handleAxiosError } from '../utils/httpUtils';
import { Logger } from '../utils/logger';
import { Spinner } from '../utils/spinner';
import { UserFriendlyError } from '../utils/userFriendlyErrors';
import { cleanupTemporaryZips } from './iOSdSYMUtils';

// for the group of all file uploads
interface UploadDSYMZipFilesOptions {
  zipFiles: string[];
  uploadPath: string;
  realm: string;
  token: string;
  logger: Logger;
  spinner: Spinner;
}

// for a single upload
interface UploadParams {
  filePath: string;
  fileName: string;
  url: string;
  token: string;
  logger: Logger;
  spinner: Spinner;
}

/**
 * Iterate over zipped files and upload them.
 */
export async function uploadDSYMZipFiles({
  zipFiles,
  uploadPath,
  realm,
  token,
  logger,
  spinner,
}: UploadDSYMZipFilesOptions): Promise<void> {
  const url = generateUrl({
    apiPath: IOS_CONSTANTS.PATH_FOR_UPLOAD,
    realm,
  });
  logger.info(`url: ${url}`);
  logger.info(`Preparing to upload dSYMs files from directory: ${uploadPath}`);

  let failedUploads = 0;
  const axiosInstance = axios.create();
  attachApiInterceptor(axiosInstance, logger);

  try {
    for (const filePath of zipFiles) {
      try {
        await uploadDSYM({
          filePath,
          url,
          token,
          logger,
          spinner,
          axiosInstance,
        });
      } catch (error: any) {
        failedUploads++;
        logger.error(error.message);
      }
    }

    if (failedUploads > 0) {
      throw new Error(`Upload failed for ${failedUploads} file${failedUploads !== 1 ? 's' : ''}`);
    }
  } finally {
    cleanupTemporaryZips(uploadPath);
  }
}

export async function uploadDSYM({ filePath, url, token, logger, spinner }: UploadParams): Promise<void> {
  console.log(`debug: fileName is ${fileName}`);
  
  spinner.start(`Uploading file: ${filePath}`);

  try {
    await uploadFile({
      url,
      file: {
        filePath,
        fieldName: 'file',
      },
      token,
      parameters: {},
      onProgress: ({ progress, loaded, total }) => {
        spinner.updateText(`Uploading ${filePath}: ${progress.toFixed(2)}% (${loaded}/${total} bytes)`);
      },
    });
  spinner.stop();
  logger.info(`Upload complete for ${filePath}`);
}

interface ListParams {
  url: string;
  token: string;
  logger: Logger;
}

export async function listDSYMs({ url, token, logger }: ListParams): Promise<IOSdSYMMetadata[]> {
  const axiosInstance = axios.create();
  attachApiInterceptor(axiosInstance, logger);
  try {
    const response = await axiosInstance.get<IOSdSYMMetadata[]>(url, {
      headers: {
        'Content-Type': 'application/json',
        [TOKEN_HEADER]: token,
      },
    });
    return response.data;
  } catch (error: any) {
    // The error is already a UserFriendlyError thrown by the interceptor
    logger.error(error.message);
    throw error;
  }
}
