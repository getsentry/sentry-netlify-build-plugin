# Sentry Netlify build plugin &nbsp;&nbsp;&nbsp;<a href="https://app.netlify.com/start/deploy?repository=https://github.com/getsentry/sentry-netlify-build-plugin"><img src="https://www.netlify.com/img/deploy/button.svg"></a>

Automatically upload source maps and notify [Sentry](https://sentry.io/) of new releases being deployed to your site after it finishes building in Netlify.

The Sentry Netlify build plugin:
* Notifies Sentry of new releases being deployed.
* Uploads source maps to Sentry.
* Sends Sentry the commit SHA of HEAD to enable commit features.

Before proceeding, you'll first want to ensure that your Sentry project is set up properly to track commit metadata. The easiest way to do that is to [install a repository integration](https://docs.sentry.io/workflow/releases/?platform=python#install-repo-integration).

Make sure build plugins are enabled on your site to see the plugin run.

## Installation

To install, add the following lines to your `netlify.toml` file:

```toml
[[plugins]]
  package = "@sentry/netlify-build-plugin"
```

Note: The `[[plugins]]` line is required for each plugin, even if you have other plugins in your `netlify.toml` file already.

### Create a Sentry Internal Integration
For Netlify to communicate securely with Sentry, you'll need to create a new internal integration. In Sentry, navigate to: *Settings > Developer Settings > New Internal Integration*.

Give your new integration a name (for example, Netlify Deploy Integration”) and specify the necessary permissions. In this case, we need Admin access for “Release” and Read access for “Organization”.

![View of internal integration permissions.](images/internal-integration-permissions.png)

Click “Save” at the bottom of the page and grab your token, which you’ll need this in the next step.


### Set Environment Variables in Netlify
Save the internal integration token as a [site environment variable](https://docs.netlify.com/configure-builds/environment-variables/):
1. In Netlify, go to your site's settings.
2. Click on "Build & deploy".
3. Add a new environment variable and enter `SENTRY_AUTH_TOKEN` as the name and your internal integration token as the value.

![View of internal integration permissions.](images/netlify-environment-variables.png)

### Configuration
Configure the plugin with your Sentry settings:
```toml
[[plugins]]
  package = "@sentry/netlify-build-plugin"

  [plugins.inputs]
    sentryOrg = ""
    sentryProject = ""
```

For more information about the parameters below, please see the [Sentry release management docs](https://docs.sentry.io/cli/releases/).


#### Plugin Inputs
| name | description | default |
|------|-------------|---------|
| `sentryOrg` | The slug of the organization name in Sentry. | - |
| `sentryProject` | The slug of the project name in Sentry. | - |
| `sentryAuthToken` | Authentication token for Sentry. We recommend this be set as an environment variable (see below). | - |
| `sourceMapPath` | Folder in which to scan for source maps to upload. | Netlify publish directory |
| `sourceMapUrlPrefix` | Prefix for the location of source maps. | `"~/"` |
| `skipSetCommits` | Set this to true if you want to disable commit tracking. | `false` |
| `skipSourceMaps` | Set this to true if you want to disable sending source maps to Sentry. | `false` |
| `releasePrefix` | Set this to prefix the release name with the value. | - |

#### Environment Variables

You can also use [site environment variables](https://docs.netlify.com/configure-builds/environment-variables/) to configure these values:
| name | description | default |
|------|-------------|---------|
| `SENTRY_AUTH_TOKEN` | Authentication token for Sentry. | - |
| `SENTRY_ORG` | The slug of the organization name in Sentry. | - |
| `SENTRY_PROJECT` | The slug of the project name in Sentry. | - |
| `SENTRY_ENVIRONMENT` | The name of the environment being deployed to. | Netlify [deploy context](https://docs.netlify.com/site-deploys/overview/#deploy-contexts) |
| `SENTRY_RELEASE_PREFIX` | Set this to prefix the release name with the value. | - |
