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
import { basename } from 'path';
import { uploadFile } from '../utils/httpUtils';
import { TOKEN_HEADER, IOS_CONSTANTS } from '../utils/constants';
import { generateUrl } from './iOSdSYMUtils';
import { Logger } from '../utils/logger';
import { Spinner } from '../utils/spinner';
import { IOSdSYMMetadata } from '../utils/metadataFormatUtils';
import { cleanupTemporaryZips } from './iOSdSYMUtils';
import { attachApiInterceptor } from '../utils/apiInterceptor';

interface UploadDSYMZipFilesOptions {
  zipFiles: string[];
  uploadPath: string;
  realm: string;
  token: string;
  logger: Logger;
  spinner: Spinner;
}

interface UploadParams {
  filePath: string;
  fileName: string;
  url: string;
  token: string;
  logger: Logger;
  spinner: Spinner;
  axiosInstance: AxiosInstance;
}

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

  const axiosInstance = axios.create();
  attachApiInterceptor(axiosInstance, logger, { userFriendlyMessage: 'An error occurred during dSYM upload.' });

  try {
    for (const filePath of zipFiles) {
      const fileName = basename(filePath);
      await uploadDSYM({
        filePath,
        fileName,
        url,
        token,
        logger,
        spinner,
        axiosInstance,
      });
    }

  } finally {
    logger.debug('Cleaning up temporary zip files...');
    cleanupTemporaryZips(uploadPath);
  }
}

export async function uploadDSYM({ filePath, fileName, url, token, logger, spinner, axiosInstance }: UploadParams): Promise<void> {
  logger.debug(`Uploading dSYM: ${fileName}`);
  
  spinner.start(`Uploading file: ${filePath}`);

  await uploadFile({
    url,
    file: {
      filePath,
      fieldName: 'file',
    },
    token,
    parameters: {
      'filename': fileName,
    },
    onProgress: ({ progress, loaded, total }) => {
      spinner.updateText(`Uploading ${filePath}: ${progress.toFixed(2)}% (${loaded}/${total} bytes)`);
    },
  }, axiosInstance);

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
  attachApiInterceptor(axiosInstance, logger); // Interceptor will throw UserFriendlyError on API failure
  try {
    const response = await axiosInstance.get<IOSdSYMMetadata[]>(url, {
      headers: {
        'Content-Type': 'application/json',
        [TOKEN_HEADER]: token,
      },
    });
    return response.data;
  } catch (error) {
    // Log at debug level here, as the command-level handler will log the user-facing error.
    if (error instanceof Error) {
      logger.debug(`[dsymClient:listDSYMs] API call failed: ${error.message}`);
    } else {
      logger.debug(`[dsymClient:listDSYMs] API call failed with unknown error: ${String(error)}`);
    }
    throw error; // Re-throw for the command handler to catch and present to user
  }
}
