'use strict';

const fs = require('fs');
const settings = require('../settings.json'); // eslint-disable-line node/no-missing-require
const octokit = require('@octokit/rest')();
const log = require('loglevel');
const Papa = require('papaparse');
log.setLevel('info');

octokit.authenticate({
  type: 'oauth',
  key: settings.githubClientID,
  secret: settings.githubClientSecret,
});

/**
 * Take a filepath to a json object of issues
 * and a filename to save the resulting issue data,
 * then makes api call to GitHub to retrieve current data
 * @param {string} data
 * @param {string} file
 */
async function retrieveIssues(data) {
  log.info('RETRIEVING ISSUES...');
  let repo;
  // read each line of a .txt file of repo names (:/owner/:repo)
  try {
    let issueResults = [];
    let labelCount = {};

    const reposArray = fs
      .readFileSync(data)
      .toString()
      .split('\n')
      .map(repo => repo.trim())
      .filter(Boolean);

    // make API call to retrieve issues for each repository in the array
    for (let i in reposArray) {
      const owner = reposArray[i].match(/^[^/]+/);
      repo = reposArray[i].match(/[^/]*$/);

      await paginate(octokit.issues.getForRepo, repo, owner).then(data => {
        const results = data.map(issue => getIssueInfo(issue, labelCount));
        results.forEach(function(issue) {
          issueResults.push(issue);
        });
      });
    }

    issueResults = cleanLabels(issueResults, labelCount);
    log.info(`ISSUES RETRIEVED: ${issueResults.length}`);

    return issueResults;
  } catch (error) {
    log.error(
      `ERROR RETRIEVING ISSUES FROM GITHUB. REPOSITORY: ${repo}. PLEASE CHECK REPOSITORY LIST, GITHUB CLIENT ID, & GITHUB CLIENT SECRET. ERROR: ${error}`
    );
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
 * remove labels that occur less than 100 times in dataset
 *
 * @param {array} issues
 * @param {object} labelCount
 */
function cleanLabels(issues, labelCount) {
  let data = [];
  for (let i = issues.length - 1; i >= 0; i--) {
    let issue = issues[i];

    issue.labels = issue.labels.filter(function(value) {
      if (labelCount[value] > 99) {
        return value;
      }
    });

    if (issue.labels.length === 0 || !issue.text.match(/[^\s]/)) {
      issues.splice(i, 1);
    } else {
      // give each label a key to ease csv writing format
      for (let k in issue.labels) {
        let key = `label${k}`;
        issue[key] = issue.labels[k];
      }

      delete issue.labels;
      data.push(issue);
    }
  }
  return data;
}

/**
 * Extract relevant issue information
 *
 * @param {object} issue - GitHub repository issue
 */
function getIssueInfo(issue, labelCount) {
  try {
    const text = issue.title + ' ' + issue.body;
    const labels = issue.labels.map(labelObject => labelObject.name);

    // add label counts to labelCount object
    for (let i in labels) {
      const label = labels[i];

      if (labelCount[label]) {
        labelCount[label]++;
      } else {
        labelCount[label] = 1;
      }
    }
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
 * @param {array} issues - The issues to group.
 */
function makeCSV(issues, file) {
  try {
    let stuff = Papa.unparse(issues, {header: false, quotes: true});
    fs.appendFileSync(file, stuff);
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
  multiClass
) {
  const automl = require(`@google-cloud/automl`);
  const client = new automl.v1beta1.AutoMlClient();
  const projectLocation = client.locationPath(projectId, computeRegion);

  // Classification type is assigned based on multiClass value.
  let classificationType = `MULTILABEL`;
  if (multiClass) {
    classificationType = `MULTICLASS`;
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
  retrieveIssues: retrieveIssues,
  getIssueInfo: getIssueInfo,
  makeCSV: makeCSV,
  createDataset: createDataset,
  importData: importData,
};
