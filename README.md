# Sentry Netlify Build Plugin

Automatically upload source maps and notify [Sentry](https://sentry.io/) of new releases being deployed to your site after it finishes building in Netlify.

The Sentry Netlify build plugin:

- Notifies Sentry of new releases being deployed.
- Uploads source maps to Sentry.
- Sends Sentry the commit SHA of HEAD to enable commit features.

_**Note:** This build plugin is separate from `@netlify/sentry`, which is a monitoring plugin built by Netlify. For more information, see [`@sentry/netlify-build-plugin` vs. `@netlify/sentry`](#sentrynetlify-build-plugin-vs-netlifysentry) below._

---

- [Installation](#installation)
  - [Prepare Your Sentry Organization](#prepare-your-sentry-organization)
  - [Install the Plugin](#install-the-plugin)
  - [Configure Your SDK](#configure-your-sdk)
- [Configuration](#configuration)
  - [UI Configuration](#ui-configuration)
  - [Configuration Using Environment Variables](#configuration-using-environment-variables)
  - [Configuration in `netlify.toml`](#configuration-in-netlifytoml)
- [Options](#options)
- [`@sentry/netlify-build-plugin` vs. `@netlify/sentry`](#sentrynetlify-build-plugin-vs-netlifysentry)

## Installation

### Prepare Your Sentry Organization

Before proceeding, you'll first want to ensure that your Sentry project is set up properly to track commit metadata and allow uploading of source maps.

First, if you haven't already, [install a repository integration](https://docs.sentry.io/product/releases/#install-repo-integration).

Second, create an [internal integration in Sentry](https://docs.sentry.io/product/integrations/integration-platform/internal-integration), which will handle authentication for source map uploading.

1. In Sentry, navigate to: _Settings > Developer Settings > New Internal Integration_.
2. Give your new integration a name (for example, "Netlify Deploy Integration") and specify the necessary permissions. In this case, we need "Admin" access for "Release" and "Read" access for "Organization". You can leave all other fields blank.
3. Click "Save Changes" at the bottom of the page.
4. Once the integration has been created, it should take you to the "Edit Internal Integration" page for your integration. Scroll down to the "Tokens" section and copy your token, which you'll need when configuring the plugin.

### Install the Plugin

The plugin can be installed either through the Netlify UI or by adding configuration values to `netlify.toml`. Unless you need advanced configuration, we recommend using the UI.

#### UI Installation

To install the plugin via the Netlify UI, go to your team sites list and select the Integrations tab (or follow this direct link to the [Integrations directory](https://app.netlify.com/plugins)). Then search for "Sentry" and click **Enable** and then **Enable Release Management**.

#### File-based Installation

Alternatively, to use file-based installation, add the following lines to your `netlify.toml` file:

```toml
[[plugins]]
  package = "@sentry/netlify-build-plugin"

  [plugins.inputs]
    sentryOrg = "your org slug"
    sentryProject = "your project slug"
```

Note: The `[[plugins]]` line is required for each plugin installed via file-based installation, so you need to add it here even if you have other plugins in your `netlify.toml` file already.

### Configure Your SDK

To link errors with releases, you must include a release ID (a.k.a version) where you configure your client SDK. For more information, read our documentation on [configuring your SDK for releases](https://docs.sentry.io/workflow/releases/?platform=node#configure-sdk).

## Configuration

The Sentry build plugin can be configured in the Netlify UI, by setting environment variables, or by adding options to `netlify.toml`.

### UI Configuration

Basic configuration can be done in the Netlify UI. In the same Integrations tab where you [installed the plugin](#ui-installation), find the Sentry plugin again, click "View," and you should now see a configuration panel where you can set your auth token (from the internal integration [created above](#prepare-your-sentry-organization)) along with your organization and project slugs.

Doing this will automatically set the `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` environment variables in Netlify.

### Configuration Using Environment Variables

The plugin can be configured using [site environment variables](https://docs.netlify.com/configure-builds/environment-variables/) in Netlify:

1. In Netlify, go to your site's settings.
2. Click on "Environment Variables".
3. Add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` with their respective values. (The auth token comes from the internal integration [created above](#prepare-your-sentry-organization).)

For more configuration options see the [Options](#options) section below.

### Configuration in `netlify.toml`

You organization and project slugs can be specified in `netlify.toml` in the `plugins.inputs` section:

```toml
[[plugins]]
  package = "@sentry/netlify-build-plugin"

  [plugins.inputs]
    sentryOrg = "your org slug"
    sentryProject = "your project slug"
```

We recommend against setting your auth token in `netlify.toml`, to avoid committing it to your repo.

For more configuration options see the [Options](#options) section below.

## Options

In most cases, auth token, org slug, and project slug are all that's needed to use the plugin. For more advanced use cases, configuration can be done either by setting [site environment variables](https://docs.netlify.com/configure-builds/environment-variables/) or by adding to `netlify.toml`. Most options can be set either way.

For more information about the parameters below, please see the [Sentry release management docs](https://docs.sentry.io/cli/releases/).

| `netlify.toml` | Environment Variable | Description | Default |
| --- | --- | --- | --- |
| `sentryOrg` | `SENTRY_ORG` | Slug of the organization in Sentry. | - |
| `sentryProject` | `SENTRY_PROJECT` | Slug of the project in Sentry | - |
| `sentryAuthToken` | `SENTRY_AUTH_TOKEN` | Authentication token for Sentry. We recommend this be set as an environment variable, to avoid committing it to your repo. | - |
| `sentryRelease` | `SENTRY_RELEASE` | Release ID (a.k.a version) | [COMMIT_REF](https://docs.netlify.com/configure-builds/environment-variables/#git-metadata) env variable, automatically set by Netlify |
| `sentryRepository` | `SENTRY_REPOSITORY` | Name of the repository linked to your Sentry repository integration, in the form `org-name/repo-name` | Derived from [REPOSITORY_URL](https://docs.netlify.com/configure-builds/environment-variables/#git-metadata) env variable, automatically set by Netlify |
| `releasePrefix` | `SENTRY_RELEASE_PREFIX` | Prefix to add to the release name | - |
| - | `SENTRY_ENVIRONMENT` | Name of the environment being deployed to | Netlify [deploy context](https://docs.netlify.com/site-deploys/overview/#deploy-contexts) |
| `sourceMapPath` | - | Folder to scan for source maps to upload | Netlify publish directory |
| `sourceMapUrlPrefix` | - | Prefix for uploaded source map filenames (see [sentry-cli docs](https://docs.sentry.io/product/cli/releases/#sentry-cli-sourcemaps)) | `"~/"` |
| `skipSetCommits` | - | If true, disable commit tracking. | `false` |
| `skipSourceMaps` | - | If true, disable uploading source maps to Sentry. | `false` |
| `deployPreviews` | - | If false, skip running the build plugin on preview deploys. | `true` |
| `deleteSourceMaps` | SENTRY_DELETE_SOURCEMAPS | If true, delete source maps after uploading them to Sentry. May cause browser console errors if not used alongside your build tool's equivalent of webpack's [`hidden-source-map` option](https://webpack.js.org/configuration/devtool/). | `false` |
| `enableLocal` | SENTRY_LOCAL | If true, create a Sentry release for local builds. | `false` |

## `@sentry/netlify-build-plugin` vs. `@netlify/sentry`

Both Sentry and Netlify have created plugins which integrate the two services. The Sentry plugin (the one whose docs you're reading right now) is a build plugin, which handles release management and source map uploading. The Netlify plugin, is a monitoring plugin, which adds Sentry to Netlify functions. Docs for that plugin can be found [here](https://docs.netlify.com/netlify-labs/experimental-features/sentry-integration/).

The two plugins can be enabled separately or together, depending on your installation method. In the Netlify UI, they are enabled together, in the Integrations tab, and there you will see settings for both. If enabled through `netlify.toml`, they must be enabled separately, with a `[[plugins]]` section added for each.

Note that in the Netlify UI, the Sentry plugin has a `Beta` label. This applies to only to the Netlify-built plugin, not this one.
