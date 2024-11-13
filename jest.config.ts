import type {Config} from 'jest';

const config: Config = {
  clearMocks: true,
  moduleFileExtensions: [
    "js",
    "ts"
  ],
  preset: 'ts-jest',
  testEnvironment: "node",
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};

export default config;
