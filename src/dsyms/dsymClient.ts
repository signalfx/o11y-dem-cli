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
import fs from 'fs';
import { AxiosError } from 'axios';
import { Logger } from '../utils/logger';
import { Spinner } from '../utils/spinner';

interface UploadParams {
  filePath: string;
  url: string;
  token: string;
  logger: Logger;
  spinner: Spinner;
  TOKEN_HEADER: string;
}

export async function uploadDSYM({ filePath, url, token, logger, spinner, TOKEN_HEADER }: UploadParams): Promise<void> {
  const fileSizeInBytes = fs.statSync(filePath).size;
  const fileStream = fs.createReadStream(filePath);
  const headers = {
    'Content-Type': 'application/zip',
    [TOKEN_HEADER]: token,
    'Content-Length': fileSizeInBytes,
  };

  spinner.start(`Uploading file: ${filePath}`);

  try {
    await axios.put(url, fileStream, { headers });
    spinner.stop();
    logger.info(`Upload complete for ${filePath}`);
  } catch (error) {
    spinner.stop();
    const ae = error as AxiosError;
    const unableToUploadMessage = `Unable to upload ${filePath}`;

    if (ae.response && ae.response.status === 413) {
      logger.warn(`${ae.response.status} ${ae.response.statusText}`);
      logger.warn(unableToUploadMessage);
    } else if (ae.response) {
      logger.error(`${ae.response.status} ${ae.response.statusText}`);
      logger.error(ae.response.data);
      logger.error(unableToUploadMessage);
    } else if (ae.request) {
      logger.error(`Response from ${url} was not received`);
      logger.error(ae.cause);
      logger.error(unableToUploadMessage);
    } else {
      logger.error(`Request to ${url} could not be sent`);
      logger.error(error);
      logger.error(unableToUploadMessage);
    }
    throw new Error(unableToUploadMessage);
  }
}

interface ListParams {
  url: string;
  token: string;
  logger: Logger;
  TOKEN_HEADER: string;
}

export async function listDSYMs({ url, token, logger, TOKEN_HEADER }: ListParams): Promise<void> {
  try {
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        [TOKEN_HEADER]: token,
      },
    });
    logger.info('Raw Response Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error instanceof AxiosError && error.response) {
      logger.error(`HTTP ${error.response.status}: ${error.response.statusText}`);
      logger.error(error.response.data);
    } else if (error instanceof Error) {
      logger.error('Failed to fetch the list of uploaded files:', error.message);
    } else {
      logger.error('Failed to fetch the list of uploaded files:', String(error));
    }
    throw error;
  }
}
