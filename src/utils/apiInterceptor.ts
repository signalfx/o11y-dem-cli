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

import { AxiosError, AxiosInstance } from 'axios';
import { Logger } from './logger';
import { UserFriendlyError } from './userFriendlyErrors';
import { ErrorCategory, StandardError, formatCLIErrorMessage } from './httpUtils';

interface InterceptorOptions {
  userFriendlyMessage?: string;
}

export function attachApiInterceptor(axiosInstance: AxiosInstance, logger: Logger, options: InterceptorOptions = {}) {
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      let standardError: StandardError;
      const { response: axiosResponse, request, code } = error;

      if (axiosResponse) {
        const { status, data } = axiosResponse;
        standardError = {
          type: ErrorCategory.GeneralHttpError,
          message: `HTTP ${status}: ${error.message}`,
          details: { status: status, data: data },
          userFriendlyMessage: options.userFriendlyMessage || `The server returned an error (${status}). Please check your input and try again.`,
        };
        if (status === 401) {
          standardError.userFriendlyMessage = 'Error: API access token is required.';
        } else if (status === 404) {
          standardError.userFriendlyMessage = 'Resource not found. Please check the URL or resource ID.';
        } else if (status === 413) {
          standardError.type = ErrorCategory.RequestEntityTooLarge;
          standardError.userFriendlyMessage = 'The uploaded file is too large. Please reduce the file size and try again.';
        }
      } else if (request) {
        let userFriendlyMessage = 'Please check your network connection or try again later.';
        let errorType = ErrorCategory.NoResponse;
        if (code === 'ECONNREFUSED') {
          userFriendlyMessage = 'The server is not listening for connections. Please check the server status and try again.';
          errorType = ErrorCategory.NetworkIssue;
        } else if (code === 'ENOTFOUND') {
          userFriendlyMessage = 'The server could not be found. Please check the URL and try again.';
          errorType = ErrorCategory.NetworkIssue;
        }
        standardError = {
          type: errorType,
          message: `No response received: ${error.message}`,
          userFriendlyMessage: userFriendlyMessage,
        };
      } else {
        standardError = {
          type: ErrorCategory.Unexpected,
          message: `An unexpected error occurred: ${error.message}`,
          userFriendlyMessage: options.userFriendlyMessage || 'An unexpected error occurred.',
        };
      }

      // standardError.message is included in the UserFriendlyError, so no need to log it here.
      // logger.error(standardError.message); // Removed to avoid redundant logging

      // 'details' can contain more verbose info (like response body) useful for debugging.
      if (standardError.details) {
        logger.debug('Error details:', standardError.details);
      }

      throw new UserFriendlyError(error, formatCLIErrorMessage(standardError));
    }
  );
}
