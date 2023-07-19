/*
  The Sentry Netlify build plugin:
    - Notifies Sentry of new releases being deployed.
    - Uploads source maps to Sentry.
    - Sends Sentry the commit SHA of HEAD to enable commit features.
*/

const fs = require('fs');
const path = require('path');
const SentryCli = require('@sentry/cli');
const { promisify, inspect } = require('util');
const { version } = require('./package.json');
const rimraf = require('rimraf');

const writeFile = promisify(fs.writeFile);
const deleteFile = promisify(fs.unlink);

const CWD = path.resolve(process.cwd());
const SENTRY_CONFIG_PATH = path.resolve(CWD, '.sentryclirc');
const DEFAULT_SOURCE_MAP_URL_PREFIX = '~/';

module.exports = {
  onPostBuild: async pluginApi => {
    const { constants, inputs, utils } = pluginApi;
    const { PUBLISH_DIR, IS_LOCAL } = constants;

    const RUNNING_IN_NETLIFY = !IS_LOCAL;
    const IS_PREVIEW = process.env.CONTEXT == 'deploy-preview';

    /* Set the user input settings */
    const sentryUrl = process.env.SENTRY_URL || inputs.sentryUrl;
    const sentryOrg = process.env.SENTRY_ORG || inputs.sentryOrg;
    const sentryProject = process.env.SENTRY_PROJECT || inputs.sentryProject;
    const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN || inputs.sentryAuthToken;
    const sentryRelease = process.env.SENTRY_RELEASE || inputs.sentryRelease || process.env.COMMIT_REF;
    const releasePrefix = process.env.SENTRY_RELEASE_PREFIX || inputs.releasePrefix || '';
    const sentryEnvironment = process.env.SENTRY_ENVIRONMENT || process.env.CONTEXT;
    const sentryRepository = process.env.SENTRY_REPOSITORY || inputs.sentryRepository;
    const sourceMapPath = inputs.sourceMapPath || PUBLISH_DIR;
    const sourceMapUrlPrefix = inputs.sourceMapUrlPrefix || DEFAULT_SOURCE_MAP_URL_PREFIX;
    const shouldDeleteMaps = inputs.deleteSourceMaps || SENTRY_DELETE_SOURCEMAPS;
    const enableLocal = process.env.SENTRY_LOCAL || inputs.enableLocal;

    if (RUNNING_IN_NETLIFY || enableLocal) {
      if (IS_PREVIEW && !inputs.deployPreviews) {
        console.log('Skipping Sentry release creation - Deploy Preview');
        return;
      }

      if (!sentryAuthToken) {
        return utils.build.failBuild(
          'SentryCLI needs an authentication token. Please set env variable SENTRY_AUTH_TOKEN',
        );
      } else if (!sentryOrg) {
        return utils.build.failBuild(
          'SentryCLI needs the organization slug. Please set env variable SENTRY_ORG or set sentryOrg as a plugin input',
        );
      } else if (!sentryProject) {
        return utils.build.failBuild(
          'SentryCLI needs the project slug. Please set env variable SENTRY_PROJECT or set sentryProject as a plugin input',
        );
      }

      await createSentryConfig({
        sentryOrg,
        sentryProject,
        sentryAuthToken,
        sentryUrl,
      });

      /* Apply release prefix */
      const release = `${releasePrefix}${sentryRelease}`;

      /* Notify Sentry of release being deployed on Netlify */
      await createSentryRelease({
        pluginApi,
        release,
        sentryEnvironment,
        sentryRepository,
        sourceMapPath,
        sourceMapUrlPrefix,
      });

      console.log();
      console.log('Successfully notified Sentry of deployment!');
      console.log();

      await deleteSentryConfig();

      if (shouldDeleteMaps) {
        console.log('Removing source map files.');
        await rimraf(sourceMapPath, {
          filter: filepath => filepath.endsWith('.map'),
        });
      }
    }
  },
};

async function createSentryRelease({
  pluginApi,
  release,
  sentryEnvironment,
  sentryRepository,
  sourceMapPath,
  sourceMapUrlPrefix,
}) {
  // default config file is read from ~/.sentryclirc
  const { constants, inputs, utils } = pluginApi;
  const cli = new SentryCli();

  console.log('Creating new release with version: ', release);

  // https://docs.sentry.io/cli/releases/#creating-releases
  try {
    await cli.releases.new(release);
  } catch (error) {
    if (error.message.includes('401')) {
      return utils.build.failBuild(
        'SentryCLI failed to create a new release. Invalid Sentry authentication token. (http status: 401)',
      );
    } else if (error.message.includes('403')) {
      return utils.build.failBuild(
        'SentryCLI failed to create a new release. You do not have permission to perform this action. (http status: 403)',
      );
    } else {
      console.log(error);
      return utils.build.failBuild('SentryCLI failed to create a new release.');
    }
  }

  // https://docs.sentry.io/cli/releases/#managing-release-artifacts
  if (!inputs.skipSourceMaps) {
    await cli.releases.uploadSourceMaps(release, {
      debug: false,
      include: [sourceMapPath],
      urlPrefix: sourceMapUrlPrefix,
      rewrite: true,
      ignore: ['node_modules'],
    });
  }

  // https://docs.sentry.io/cli/releases/#sentry-cli-commit-integration
  if (!inputs.skipSetCommits) {
    const repository = sentryRepository || process.env.REPOSITORY_URL.split(/[:/]/).slice(-2).join('/');
    try {
      await cli.releases.setCommits(release, {
        repo: repository,
        commit: process.env.COMMIT_REF,
      });
    } catch (error) {
      console.log(error);
      return utils.build.failBuild(
        `SentryCLI failed to set commits. You likely need to set up a repository or repository integration.
         Read more: https://docs.sentry.io/workflow/releases/?platform=python#install-repo-integration`,
      );
    }
  }
  // https://docs.sentry.io/cli/releases/#finalizing-releases
  await cli.releases.finalize(release);

  // https://docs.sentry.io/cli/releases/#creating-deploys
  await cli.releases.execute(['releases', 'deploys', release, 'new', '-e', sentryEnvironment]);
}

async function createSentryConfig({ sentryOrg, sentryProject, sentryAuthToken, sentryUrl }) {
  const sentryConfigFile = `
  [auth]
  token=${sentryAuthToken}
  [defaults]
  ${sentryUrl ? `url=${sentryUrl}` : ''}
  project=${sentryProject}
  org=${sentryOrg}
  pipeline=netlify-build-plugin/${version}
  `;
  await writeFile(SENTRY_CONFIG_PATH, sentryConfigFile, { flag: 'w+' });
}

async function deleteSentryConfig() {
  await deleteFile(SENTRY_CONFIG_PATH);
}

function fileExists(s) {
  // eslint-disable-next-line
  return new Promise(r => fs.access(s, fs.F_OK, e => r(!e)));
}
