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
import { Logger } from './utils/logger';
import { UserFriendlyError } from './utils/userFriendlyErrors';
import { ErrorCategory, StandardError, formatCliErrorMessage } from './utils/httpUtils';

export function attachApiInterceptor(axiosInstance: any, logger: Logger) {
    axiosInstance.interceptors.response.use(
        (response) => response,
        (error: AxiosError) => {
            let standardError: StandardError;

            if (error.response) {
                // HTTP Errors
                const { status, data } = error.response;
                standardError = {
                    type: ErrorCategory.GeneralHttpError,
                    message: `HTTP ${status}: ${error.message}`,
                    details: {
                        status: status,: API access token is required.';
                } else if (status === 404) {
                    standardError.userFriendlyMessage = 'Resource not found. Please check the URL or resource ID.';
                } else if (status === 413) {
                    standardError.type = ErrorCategory.RequestEntityTooLarge;
                    standardError.userFriendlyMessage = 'The uploaded file is too large. Please reduce the file size and try again.';
                }
            } else if (error.request) {
                // Transport Errors
                standardError = {
                    type: ErrorCategory.NoResponse,
                    message: `No response received: ${error.message}`,
                    userFriendlyMessage: 'Please check your network connection or try again later.';
                };
            } else {
                // Unexpected Errors (Axios configuration, etc.)
                standardError = {
                    type: ErrorCategory.Unexpected,
                    message: `Unexpected error: ${error.message}`,
                    userFriendlyMessage: 'An unexpected error occurred.';
                };
            }

            logger.error(standardError.message);
            if (standardError.details) {
                logger.debug('Error details:', standardError.details);
            }

            // Wrap the error in a UserFriendlyError for CLI display
            throw new UserFriendlyError(error, formatCliErrorMessage(standardError));
        }
    );
}

