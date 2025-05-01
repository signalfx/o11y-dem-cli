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

import axios from 'axios';
import { uploadFile } from '../utils/httpUtils';
import { TOKEN_HEADER, IOS_CONSTANTS } from '../utils/constants';
import { generateUrl } from './iOSdSYMUtils';
import { basename } from 'path';
import { handleAxiosError } from '../utils/httpUtils';
import { Logger } from '../utils/logger';
import { Spinner } from '../utils/spinner';
import { UserFriendlyError } from '../utils/userFriendlyErrors';
import { IOSdSYMMetadata } from '../utils/metadataFormatUtils';
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

  try {
    for (const filePath of zipFiles) {
      const fileName = basename(filePath);
      try {
        await uploadDSYM({
          filePath,
          fileName,
          url,
          token,
          logger,
          spinner,
        });
      } catch (error) {
        failedUploads++;
        if (error instanceof UserFriendlyError) {
          logger.error(error.message);
        } else {
          logger.error('Unknown error during upload');
        }
      }
    }

    // Handle failed uploads
    if (failedUploads > 0) {
      throw new Error(`Upload failed for ${failedUploads} file${failedUploads !== 1 ? 's' : ''}`);
    }
  } finally {
    // Always cleanup temporary files
    cleanupTemporaryZips(uploadPath);
  }
}

export async function uploadDSYM({ filePath, fileName, url, token, logger, spinner }: UploadParams): Promise<void> {

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
      parameters: {
        'filename': fileName,
      },
      onProgress: ({ progress, loaded, total }) => {
        spinner.updateText(`Uploading ${filePath}: ${progress.toFixed(2)}% (${loaded}/${total} bytes)`);
      },
    });

    spinner.stop();
    logger.info(`Upload complete for ${filePath}`);
  } catch (error) {
    spinner.stop();
    const operationMessage = `Unable to upload ${filePath}`;
    const result = handleAxiosError(error, operationMessage, url, logger);

    if (result) {
      const userFriendlyMessage = `Failed to upload ${filePath}. Please check your network connection, realm, and token values, and ensure the file size does not exceed the limit.`;
      throw new UserFriendlyError(error, userFriendlyMessage);
    }
  }
}

interface ListParams {
  url: string;
  token: string;
  logger: Logger;
}

export async function listDSYMs({ url, token, logger }: ListParams): Promise<IOSdSYMMetadata[]> {
  try {
    const response = await axios.get<IOSdSYMMetadata[]>(url, {
      headers: {
        'Content-Type': 'application/json',
        [TOKEN_HEADER]: token,
      },
    });
    return response.data;
  } catch (error) {
    const operationMessage = 'Unable to fetch the list of uploaded files.';
    const result = handleAxiosError(error, operationMessage, url, logger);
    if (result) {
      const userFriendlyMessage = `There was a problem accessing the list of uploaded files. 
      Please check your network connection or try again later.`;
      throw new UserFriendlyError(error, userFriendlyMessage);
    }
    logger.error('Unhandled error occurred while fetching dSYMs.');
    return [];
  }
}
