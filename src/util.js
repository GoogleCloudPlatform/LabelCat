'use strict';

const axios = require('axios');
const fs = require('fs');
const settings = require('../settings.json'); // eslint-disable-line node/no-missing-require
const Json2csvParser = require('json2csv').Parser;
const log = require('loglevel');
log.setLevel('info');
const automl = require(`@google-cloud/automl`);
/**
 * Take a filepath to a json object of issues
 * and a filename to save the resulting issue data,
 * then makes api call to GitHub to retrieve current data
 * @param {string} data
 * @param {string} file
 */
async function retrieveIssues(data) {
  // read each line of a .txt file of repo names (:/owner/:repo)
  try {
    const reposArray = fs
      .readFileSync(data)
      .toString()
      .split('\n')
      .map(repo => repo.trim())
      .filter(Boolean);

    let issueResults = [];

    // make API call to retrieve issues for each repository in the array
    for (let i in reposArray) {
      const repo = reposArray[i];
      const githubClientID = settings.githubClientID;
      const githubClientSecret = settings.githubClientSecret;

      const url = `https://api.github.com/repos/${repo}/issues?state=all&per_page=100&client_id=${githubClientID}&client_secret=${githubClientSecret}`;

      const response = await axios.get(url);

      const issuesArray = response.data;
      const results = issuesArray.map(issue => getIssueInfo(issue));

      results.forEach(function(issue) {
        issueResults.push(issue);
      });
    }
    return issueResults;
  } catch (error) {
    log.error(
      'ERROR RETRIEVING ISSUES FROM GITHUB. PLEASE CHECK REPOSITORY LIST, GITHUB CLIENT ID, & GITHUB CLIENT SECRET.'
    );
  }
}

/**
 * Extract relevant issue information
 *
 * @param {object} issue - GitHub repository issue
 */
function getIssueInfo(issue) {
  try {
    const text = issue.title + ' ' + issue.body;

    return {
      text: text,
      labels: issue.labels.map(labelObject => labelObject.name),
    };
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
    const fields = ['text', 'labels'];
    const json2csvParser = new Json2csvParser({fields, unwind: 'labels'});
    const csv = json2csvParser.parse(issues);
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

async function listDatasets(projectId, computeRegion) {
  const client = new automl.v1beta1.AutoMlClient();
  const projectLocation = client.locationPath(projectId, computeRegion);

  try {
    const responses = await client.listDatasets({parent: projectLocation})
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

//
// function createModel(projectId, computeRegion, datasetId, modelName) {
//   const client = new automl.v1beta1.AutoMlClient();
//
//   // A resource that represents Google Cloud Platform location.
//   const projectLocation = client.locationPath(projectId, computeRegion);
//
//   // Set model name and model metadata for the dataset.
//   const myModel = {
//     displayName: modelName,
//     datasetId: datasetId,
//     textClassificationModelMetadata: {},
//   };
//
//   // Create a model with the model metadata in the region.
//   client
//     .createModel({parent: projectLocation, model: myModel})
//     .then(responses => {
//       const operation = responses[0];
//       const initialApiResponse = responses[1];
//
//       console.log(`Training operation name: ${initialApiResponse.name}`);
//       console.log(`Training started...`);
//       return operation.promise();
//     })
//     .then(responses => {
//       // The final result of the operation.
//       const model = responses[0];
//
//       // Retrieve deployment state.
//       let deploymentState = ``;
//       if (model.deploymentState === 1) {
//         deploymentState = `deployed`;
//       } else if (model.deploymentState === 2) {
//         deploymentState = `undeployed`;
//       }
//
//       // Display the model information.
//       console.log(`Model name: ${model.name}`);
//       console.log(`Model id: ${model.name.split(`/`).pop(-1)}`);
//       console.log(`Model display name: ${model.displayName}`);
//       console.log(`Model create time:`);
//       console.log(`\tseconds: ${model.createTime.seconds}`);
//       console.log(`\tnanos: ${model.createTime.nanos}`);
//       console.log(`Model deployment state: ${deploymentState}`);
//     })
//     .catch(err => {
//       console.error(err);
//     });
//   // [END automl_natural_language_createModel]
// }


module.exports = {
  retrieveIssues: retrieveIssues,
  getIssueInfo: getIssueInfo,
  makeCSV: makeCSV,
  createDataset: createDataset,
  importData: importData,
  // createModel,
  listDatasets
};
