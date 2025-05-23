![Status](https://img.shields.io/badge/status-under%20development-informational?style=for-the-badge)
![Build Status](https://img.shields.io/github/actions/workflow/status/signalfx/splunk-rum-cli/.github/workflows/ci.yml?branch=main&style=for-the-badge)
![GDI Specification](https://img.shields.io/badge/GDI-1.7.0-blueviolet?style=for-the-badge)
![Node](https://img.shields.io/node/v/@splunk/rum-cli?style=for-the-badge)

# Splunk RUM CLI

The Splunk RUM CLI is a tool for uploading Android mapping files, iOS dSYM files, and browser source map files to the Splunk Observability Cloud back end for deobfuscating or symbolicating stack traces. This tool is part of Splunk's Real User Monitoring (RUM) suite.

## Features

* Uploading and listing of Android Proguard mapping files
* Uploading and listing of iOS dSYM mapping files
* Performing JavaScript bundle modifications to enable automatic source mapping
* Uploading JavaScript source map files

## Documentation

For official documentation on the Splunk RUM CLI, see
[Install the splunk-rum CLI](https://quickdraw.splunk.com/redirect/?product=Observability&location=rum.buildintegration&version=current)

## Getting Started

To install the CLI from npm, run:
```
npm install -g @splunk/rum-cli
```

After installing, for an overview of the splunk-rum CLI and available commands, run:
```
splunk-rum
```

## Build and Development

To build locally, run:

```
npm install
npm run build
npm link
```

You can now run `splunk-rum` locally from the command line:
```
splunk-rum --version
```

To develop locally, you can use the `build:watch` script to automatically rebuild the project as you make changes:
```
npm run build:watch
```

# License

The Splunk RUM CLI is licensed under the terms of the Apache Software License
version 2.0. See [the license file](./LICENSE) for more details.
