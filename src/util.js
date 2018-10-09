'use strict';

const fs = require('fs');
const settings = require('../settings.json'); // eslint-disable-line node/no-missing-require
const octokit = require('@octokit/rest')();
const log = require('loglevel');
const Papa = require('papaparse');
log.setLevel('info');

/**
 * Take a filepath to a json object of issues
 * and a filename to save the resulting issue data,
 * then makes api call to GitHub to retrieve current data
 * @param {string} data
 * @param {string} file
 */
async function retrieveIssues(data, label, alternatives) {
  octokit.authenticate({
    type: 'oauth',
    key: settings.githubClientID,
    secret: settings.githubClientSecret,
  });

  log.info('RETRIEVING ISSUES...');
  let repo, owner;

  // read each line of a .txt file of repo names (:/owner/:repo)
  try {
    let issueResults = [];

    const reposArray = fs
      .readFileSync(data)
      .toString()
      .split('\n')
      .map(repo => repo.trim())
      .filter(Boolean);

    // make API call to retrieve issues for each repository in the array
    for (let i in reposArray) {
      owner = reposArray[i].match(/^[^/]+/);
      repo = reposArray[i].match(/[^/]*$/);

      const data = await paginate(octokit.issues.getForRepo, repo, owner);
      const results = data.map(issue => getIssueInfo(issue));

      results.forEach(function(issue) {
        issueResults.push(issue);
      });
    }

    let opts = [label];
    if (alternatives) {
      opts = opts.concat(alternatives);
    }
    issueResults = issueResults.map(issue => cleanLabels(issue, opts));

    log.info(`ISSUES RETRIEVED: ${issueResults.length}`);
    return issueResults;
  } catch (error) {
    log.error(
      `ERROR RETRIEVING ISSUES FROM GITHUB. REPOSITORY: ${owner}/${repo}. PLEASE CHECK REPOSITORY LIST, GITHUB CLIENT ID, & GITHUB CLIENT SECRET. ERROR:`
    );
    log.error(error);
  }
}

async function paginate(method, repo, owner) {
  let response = await method({
    owner: owner,
    repo: repo,
    per_page: 100,
    state: 'all',
  });

  let {data} = response;
  while (octokit.hasNextPage(response)) {
    response = await octokit.getNextPage(response);
    data = data.concat(response.data);
  }

  return data;
}

/**
 * determines whether label is present on issue
 *
 * @param {array} issues
 * @param {string} label
 */
function cleanLabels(issue, opts) {
  let info;
  if (issue.labels.some(r => opts.includes(r))) {
    info = {text: issue.text, label: 1};
  } else {
    info = {text: issue.text, label: 0};
  }

  return info;
}

/**
 * Extract relevant issue information
 *
 * @param {object} issue - GitHub repository issue
 */
function getIssueInfo(issue) {
  try {
    const text = issue.title + ' ' + issue.body;
    const labels = issue.labels.map(labelObject => labelObject.name);

    return {text, labels};
  } catch (error) {
    log.error(
      'ERROR EXTRACTING ISSUE REPOSITORY URL, NUMBER, TITLE, BODY, & LABELS FROM GITHUB ISSUE OBJECT.'
    );
  }
}

/**
 * Create a csv file of issue data
 *
 * @param {array} issues - The issues to group
 * @param {string} file - Path for saving new csv
 */
function makeCSV(issues, file) {
  try {
    const csv = Papa.unparse(issues, {header: false, quotes: true});
    fs.appendFileSync(file, csv);
  } catch (error) {
    log.error('ERROR WRITING ISSUES DATA TO CSV.');
  }
}

/**
 * Create a Google AutoML Natural Language dataset
 * @param {string} projectId
 * @param {string} computeRegion
 * @param {string} datasetName
 * @param {string} multiLabel
 */
async function createDataset(
  projectId,
  computeRegion,
  datasetName,
  multiLabel
) {
  const automl = require(`@google-cloud/automl`);
  const client = new automl.v1beta1.AutoMlClient();
  const projectLocation = client.locationPath(projectId, computeRegion);

  // Classification type is assigned based on multiClass value.
  let classificationType = `MULTICLASS`;
  if (multiLabel) {
    classificationType = `MULTILABEL`;
  }

  // Set dataset name and metadata.
  const myDataset = {
    displayName: datasetName,
    textClassificationDatasetMetadata: {
      classificationType: classificationType,
    },
  };

  const response = await client.createDataset({
    parent: projectLocation,
    dataset: myDataset,
  });

  const dataset = response[0];

  if (dataset.err) {
    log.error(
      'ERROR: DATASET COULD NOT BE CREATED. PLEASE CHECK PROJECT ENVIRONMENT CONFIGURATION.'
    );
  } else {
    log.info(`Dataset name: ${dataset.name}`);
    log.info(`Dataset id: ${dataset.name.split(`/`).pop(-1)}`);
    log.info(`Dataset display name: ${dataset.displayName}`);
    log.info(`Dataset example count: ${dataset.exampleCount}`);
    log.info(`Text classification type:`);
    log.info(
      `\t ${dataset.textClassificationDatasetMetadata.classificationType}`
    );
    log.info(`Dataset create time:`);
    log.info(`\tseconds: ${dataset.createTime.seconds}`);
    log.info(`\tnanos: ${dataset.createTime.nanos}`);
  }
}

/**
 * Import data into Google AutoML NL dataset
 * @param {string} projectId
 * @param {string} computeRegion
 * @param {string} datasetId
 * @param {string} path
 */
async function importData(projectId, computeRegion, datasetId, path) {
  const automl = require(`@google-cloud/automl`);
  const client = new automl.v1beta1.AutoMlClient();

  // Get the full path of the dataset.
  const datasetFullId = client.datasetPath(projectId, computeRegion, datasetId);

  // Get the Google Cloud Storage URIs.
  const inputUris = path.split(`,`);
  const inputConfig = {
    gcsSource: {
      inputUris: inputUris,
    },
  };

  try {
    await client.importData({name: datasetFullId, inputConfig: inputConfig});
    log.info(
      `Processing import. Check AutoML dashboard for status of your import.`
    );
  } catch (error) {
    log.error(
      'ERROR: DATA COULD NOT BE IMPORTED. PLEASE CHECK PROJECT ID, COMPUTE REGION, DATASET ID, AND FILE PATH. \n Refer to AutoML dashboard for dataset status.'
    );
  }
}

module.exports = {
  retrieveIssues,
  getIssueInfo,
  makeCSV,
  createDataset,
  importData,
  cleanLabels,
};
