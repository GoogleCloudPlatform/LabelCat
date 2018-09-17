#!/usr/bin/env node

'use strict';

const axios = require('axios');
const async = require("async");
const fs = require('fs');
const settings = require('./settings.json')
const Json2csvParser = require('json2csv').Parser;
// Import the Google Cloud client library
const automl = require('@google-cloud/automl');



require(`yargs`)
  .demand(1)
  .command(
    `retrieveIssues <repoDataFilePath> <issuesDataFilePath>`,
    `Retrieve the current issue information from a json object of gitHub repositories.`,
    {},
    opts => {
      retrieveIssues(opts.repoDataFilePath, opts.issuesDataFilePath)
    }
  )
  .command(
    `createDataset <datasetName> [multilabel]`,
    `Create a new Google AutoML NL dataset with the specified name.`,
    {},
    opts => {
      const projectID = settings.projectID;
      const computeRegion = settings.computeRegion;
      const datasetName = opts.datasetName;
      const multiLabel = opts.multilabel;

      createDataset(projectID, computeRegion, datasetName, multiLabel)
    }
  )
  .command(
    `importData <issuesDataFilePath> <datasetID>`,
    `Import the GitHub issues data into the Google AutoML NL dataset by specifying the file of issues data and the dataset ID.`,
    {},
    opts => {
        //TODO: create function
    }
  )
  .command(
    `createModel <datasetID> <modelName> <GCPprojectID> <GCPcomputeRegion>`,
    `Train the Google AutoML NL model by specifying the dataset ID generated, the name for new model being generated, the ID of the Google Cloud Platform project, and the region from Google Cloud Platform project.`,
    {},
    opts => {
        //TODO: create function
    }
  )
  .command(
    `analyzeAccuracy <issuesDataFilePathilepath> <repo>`,
    `Calculate the accuracy of the model's predictons by comparing LabelCat labels applied upon issue opening with the labels present when issue was closed.`,
    {},
    opts => {
        //TODO: create function
    }
  )
  .example(`$0 retrieveIssues repoData.json issuesData.csv`, `Retrieves issues from list of repos in repoData.json and saves the resulting information to issuesData.csv.`)
  .example(`$0 createDataset Data`, `Creates a new dataset with the specified name.`)
  .example(`$0 importData issuesData.csv 1248102981`, `Imports the GitHub issues data into the dataset by specifying the file of issues data and the dataset ID.`)
  .example(`$0 createModel 22093823 “test model” 23423423 us-central1`, `Trains the Google AutoML NL model by specifying the dataset ID generated, the name for new model being generated, the ID of the Google Cloud Platform project, and the region from Google Cloud Platform project.`)
  .example(`$0 analyzeAccuracy issuesData.csv some-repo`, `Calculates the accuracy of the model's predictons by comparing LabelCat labels applied upon issue opening with the labels present when issue was closed.`)
  .wrap(120)
  .recommendCommands()
  .epilogue(`For more information, contact....`)
  .help()
  .strict().argv;



/**
 * Takes a filepath to a json object of repositories
 * and a filename to save the resulting issue data,
 * then makes api call to GitHub to retrieve current issues
 * @param {string} data
 * @param {string} file
 */
async function retrieveIssues(data, file) {
  let rawdata = fs.readFileSync(data,'utf8')
  let issues = JSON.parse(rawdata);

  const issuesArray = issues.Issues;
  const promises = issuesArray.map(issue => getIssueInfo(issue));

  // results is now array of current issue information
  const results = await Promise.all(promises);

  //save results to csv file
  makeCSV(results, file)
}


/**
 * takes an issue and returns the curreny title, body, & labels
 *
 * @param {object} issue
 */
async function getIssueInfo(issue) {
  let repoName = issue.Repo;
  let number = issue.IssueID;
  let inssueInfo = {}

  const githubClientID = settings.githubClientID;
  const githubClientSecret = settings.githubClientSecret;

  let url = `https://api.github.com/repos/${repoName}/issues/${number}?client_id=${githubClientID}&client_secret=${githubClientSecret}`;

  let response = await axios.get(url);
  // should this have different response to error?
  if (response.err) { console.log('error'); }
  else {
    let issueInfo = {}

    issueInfo.repoName = repoName;
    issueInfo.issueNumber = number;
    issueInfo.title = response.data.title;
    issueInfo.body = response.data.body;
    let labelNames = separateLabels(response.data.labels);
    issueInfo.labels = labelNames;

    return issueInfo;
  }
}

// extracts the value for the name key from each label object
// and returns an array of all the issue's labels
function separateLabels(labelsArray){
  let newArray = []
  labelsArray.forEach(function (labelObject){
    newArray.push(labelObject.name);
  });
  return newArray;
}


/**
 * Creates a csv file of issue data
 * Writes to cli argument provided by -s flag
 *
 * @param {array} issues - The issues to group.
 */
function makeCSV(issues, file) {
  const fields = ['repoName', 'issueNumber', 'title', 'body', 'labels'];

  const json2csvParser = new Json2csvParser({ fields, unwind: 'labels' });
  const csv = json2csvParser.parse(issues);

  fs.writeFileSync(file, csv);
}





async function createDataset(projectId, computeRegion, datasetName, multilabel) {
// [START automl_natural_language_createDataset]
const automl = require(`@google-cloud/automl`);

const client = new automl.v1beta1.AutoMlClient();


// A resource that represents Google Cloud Platform location.
const projectLocation = client.locationPath(projectId, computeRegion);

// Classification type is assigned based on multilabel value.
let classificationType = `MULTICLASS`;
if (multilabel) {
  classificationType = `MULTILABEL`;
}

// Set dataset name and metadata.
const myDataset = {
  displayName: datasetName,
  textClassificationDatasetMetadata: {
    classificationType: classificationType,
  },
};


// ***
// TODO: using await in this way did not work!!
// Figure out what style to use for these functions so it is consistent!!
// ***
// **
// *
// Create a dataset with the dataset metadata in the region.
// let dataset = await client.createDataset({parent: projectLocation, dataset: myDataset});
//
// if (dataset.err) {
//   console.log('error'); }
// else {
//   // Display the dataset information.
//   console.log(`Dataset name: ${dataset.name}`);
//   console.log(`Dataset id: ${dataset.name.split(`/`).pop(-1)}`);
//   console.log(`Dataset display name: ${dataset.displayName}`);
//   console.log(`Dataset example count: ${dataset.exampleCount}`);
//   console.log(`Text classification type:`);
//   console.log(
//     `\t ${dataset.textClassificationDatasetMetadata.classificationType}`
//   );
//   console.log(`Dataset create time:`);
//   console.log(`\tseconds: ${dataset.createTime.seconds}`);
//   console.log(`\tnanos: ${dataset.createTime.nanos}`);
//   }

client
  .createDataset({parent: projectLocation, dataset: myDataset})
  .then(responses => {
    const dataset = responses[0];

    // Display the dataset information.
    console.log(`Dataset name: ${dataset.name}`);
    console.log(`Dataset id: ${dataset.name.split(`/`).pop(-1)}`);
    console.log(`Dataset display name: ${dataset.displayName}`);
    console.log(`Dataset example count: ${dataset.exampleCount}`);
    console.log(`Text classification type:`);
    console.log(
      `\t ${dataset.textClassificationDatasetMetadata.classificationType}`
    );
    console.log(`Dataset create time:`);
    console.log(`\tseconds: ${dataset.createTime.seconds}`);
    console.log(`\tnanos: ${dataset.createTime.nanos}`);
  })
  .catch(err => {
    console.error(err);
  });
}
