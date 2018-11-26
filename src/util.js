'use strict';

const fs = require('fs');
const settings = require('../functions/settings.json'); // eslint-disable-line node/no-missing-require
const octokit = require('@octokit/rest')();
const Papa = require('papaparse');
const log = require('loglevel');
log.setLevel('info');
const automl = require(`@google-cloud/automl`);

/**
 * Take a filepath to a json object of issues,
 * the issue label to train the model on,
 * and alternative names for the label,
 * then makes api call to GitHub to retrieve current data
 * @param {string} data
 * @param {string} label
 * @param {array} alternatives
 */
async function retrieveIssues(data, label, alternatives) {
  octokit.authenticate({
    type: 'oauth',
    token: settings.SECRET_TOKEN,
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

    let labelList = [label];
    if (alternatives) {
      labelList = labelList.concat(alternatives);
    }
    issueResults = issueResults.map(issue => cleanLabels(issue, labelList));

    log.info(`ISSUES RETRIEVED: ${issueResults.length}`);
    return issueResults;
  } catch (error) {
    log.error(
      `ERROR RETRIEVING ISSUES FROM GITHUB. REPOSITORY: ${owner}/${repo}. PLEASE CHECK REPOSITORY LIST, GITHUB CLIENT ID, & GITHUB CLIENT SECRET. ERROR:`
    );
    log.error(error);
  }
}

/**
 * handles pagination for GitHub API call
 *
 * @param {object} method
 * @param {string} repo
 * @param {string} owner
 */
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
 * @param {object} issue
 * @param {array} labelList
 */
function cleanLabels(issue, labelList) {
  let info;
  if (issue.labels.some(label => labelList.includes(label))) {
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
    const raw = issue.title + ' ' + issue.body;

    // remove punctuation that will interfere with csv
    const text = raw.replace(/[^\w\s]/gi, '');
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
 * @param {string} PROJECT_ID
 * @param {string} COMPUTE_REGION
 * @param {string} datasetName
 * @param {string} multiLabel
 */
async function createDataset(
  PROJECT_ID,
  COMPUTE_REGION,
  datasetName,
  multiLabel
) {
  const automl = require(`@google-cloud/automl`);
  const client = new automl.v1beta1.AutoMlClient();
  const projectLocation = client.locationPath(PROJECT_ID, COMPUTE_REGION);

  // Classification type is assigned based on multiClass value
  let classificationType = `MULTICLASS`;
  if (multiLabel) {
    classificationType = `MULTILABEL`;
  }

  // Set dataset name and metadata
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
 * Import data into Google AutoML Natural Language dataset
 * @param {string} PROJECT_ID
 * @param {string} COMPUTE_REGION
 * @param {string} datasetId
 * @param {string} path
 */
async function importData(PROJECT_ID, COMPUTE_REGION, datasetId, path) {
  const client = new automl.v1beta1.AutoMlClient();

  // Get the full path of the dataset.
  const datasetFullId = client.datasetPath(
    PROJECT_ID,
    COMPUTE_REGION,
    datasetId
  );

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

/**
 * List AutoML Natural Language datasets for current GCP project
 * @param {string} PROJECT_ID
 * @param {string} COMPUTE_REGION
 */
async function listDatasets(PROJECT_ID, COMPUTE_REGION) {
  const client = new automl.v1beta1.AutoMlClient();
  const projectLocation = client.locationPath(PROJECT_ID, COMPUTE_REGION);

  try {
    const responses = await client.listDatasets({parent: projectLocation});
    const dataset = responses[0];

    // Display the dataset information.
    log.info(`DATASETS:`);
    for (let i of dataset) {
      log.info(`Dataset name: ${i.name}`);
      log.info(`Dataset id: ${i.name.split(`/`).pop(-1)}`);
      log.info(`Dataset display name: ${i.displayName}`);
      log.info(`Dataset example count: ${i.exampleCount}`);
      log.info(`Text classification type:`);
      log.info(`\t ${i.textClassificationDatasetMetadata.classificationType}`);
    }
  } catch (error) {
    log.error(
      'ERROR: DATASETS COULD NOT BE RETRIEVED. PLEASE CHECK PROJECT ID & COMPUTE REGION.'
    );
  }
}

/**
 * Create Google AutoML Natural Language model
 * @param {string} PROJECT_ID
 * @param {string} COMPUTE_REGION
 * @param {string} datasetId
 * @param {string} modelName
 */
async function createModel(PROJECT_ID, COMPUTE_REGION, datasetId, modelName) {
  const client = new automl.v1beta1.AutoMlClient();

  // A resource that represents Google Cloud Platform location.
  const projectLocation = client.locationPath(PROJECT_ID, COMPUTE_REGION);

  // Set model name and model metadata for the dataset.
  const myModel = {
    displayName: modelName,
    datasetId: datasetId,
    textClassificationModelMetadata: {},
  };
  try {
    // Create a model with the model metadata in the region.
    const responses = await client.createModel({
      parent: projectLocation,
      model: myModel,
    });
    const initialApiResponse = responses[1];
    log.info(`Training operation name: ${initialApiResponse.name}`);
    log.info(
      `Training started... \n Refer to AutoML dashboard for model status.`
    );
  } catch (error) {
    log.error(
      'ERROR: COULD NOT CREATE MODEL. PLEASE CHECK DATASET ID, PROJECT ID, & COMPUTE REGION.'
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
  createModel,
  listDatasets,
};
