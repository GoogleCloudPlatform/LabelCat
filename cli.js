#!/usr/bin/env node

'use strict';

const axios = require('axios');
const fs = require('fs');
const settings = require('./settings.json')
const Json2csvParser = require('json2csv').Parser;
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
      console.log('Not yet implemented!');
    }
  }
  .command(
    `importData <issuesDataFilePath> <datasetId>`,
    `Import the GitHub issues data into the Google AutoML NL dataset by specifying the file of issues  data and the dataset ID.`,
    {},
    opts => {
      console.log('Not yet implemented!');
    }
  )
  .command(
    `createModel <datasetId> <modelName> <projectIdjectId> <computeRegion>`,
    `Train the Google AutoML NL model by specifying the dataset ID generated, the name for new model being generated, the ID of the Google Cloud Platform project, and the region from Google Cloud Platform project.`,
    {},
    opts => {
      console.log('Not yet implemented!');
    }
  )
  .command(
    `analyzeAccuracy <issuesDataFilePathilepath> <repo>`,
    `Calculate the accuracy of the model's predictons by comparing LabelCat labels applied upon issue opening with the labels present when issue was closed.`,
    {},
    opts => {
      console.log('Not yet implemented!');
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
 * Takes a filepath to a json object of issues
 * and a filename to save the resulting issue data,
 * then makes api call to GitHub to retrieve current data
 * @param {string} data
 * @param {string} file
 */
async function retrieveIssues(data, file) {
  const rawdata = fs.readFileSync(data,'utf8')
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
  const repoName = issue.Repo;
  const number = issue.IssueID;

  const githubClientID = settings.githubClientID;
  const githubClientSecret = settings.githubClientSecret;

  let url = `https://api.github.com/repos/${repoName}/issues/${number}?client_id=${githubClientID}&client_secret=${githubClientSecret}`;

  try {
    const response = await axios.get(url);

    let issueInfo = {}

    issueInfo.repoName = repoName;
    issueInfo.issueNumber = number;
    issueInfo.title = response.data.title;
    issueInfo.body = response.data.body;

    const labelNames = response.data.labels.map(labelObject => labelObject.name)
    issueInfo.labels = labelNames;

    return issueInfo;
  } catch (error) {
    console.log(error);
  }
}

/**
 * Creates a csv file of issue data
 *
 * @param {array} issues - The issues to group.
 */
function makeCSV(issues, file) {
  const fields = ['repoName', 'issueNumber', 'title', 'body', 'labels'];

  const json2csvParser = new Json2csvParser({ fields, unwind: 'labels' });
  const csv = json2csvParser.parse(issues);

  fs.writeFileSync(file, csv);
}
