# Security

## Reporting Security Issues

Please *DO NOT* report security vulnerabilities with public GitHub issue
reports. Please [report security issues here](
https://www.splunk.com/en_us/product-security/report.html).

## Dependencies

This project relies on a variety of external dependencies. These dependencies are monitored by
[Dependabot](https://docs.github.com/en/code-security/dependabot). Dependabot regularly checks for dependencies
and automatically opens pull requests when newer versions are available.

Upgrading to the [latest release](https://github.com/signalfx/splunk-rum-cli/releases)
is recommended to ensure you have the latest security updates. If a security
vulnerability is detected for a dependency of this project then either:

- You are running an older release
- A new release with the updates has not been cut yet
- The updated dependency has not been merged likely due to some breaking change
  (in this case, we will actively work to resolve the issue)
- The dependency has not released an updated version with the patch
