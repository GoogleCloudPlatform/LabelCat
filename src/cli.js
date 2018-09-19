#!/usr/bin/env node

"use strict";

const axios = require("axios");
const fs = require("fs");
const settings = require("../settings.json");
const Json2csvParser = require("json2csv").Parser;

/**
 * Takes a filepath to a json object of issues
 * and a filename to save the resulting issue data,
 * then makes api call to GitHub to retrieve current data
 * @param {string} data
 * @param {string} file
 */
async function retrieveIssues(data, file) {
  const rawdata = fs.readFileSync(data, "utf8");
  let issues = JSON.parse(rawdata);

  const issuesArray = issues.Issues;
  const promises = issuesArray.map(issue => getIssueInfo(issue));

  // results is now array of current issue information
  const results = await Promise.all(promises);

  //save results to csv file
  makeCSV(results, file);
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

    let issueInfo = {};

    issueInfo.repoName = repoName;
    issueInfo.issueNumber = number;
    issueInfo.title = response.data.title;
    issueInfo.body = response.data.body;

    const labelNames = response.data.labels.map(
      labelObject => labelObject.name
    );
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
  const fields = ["repoName", "issueNumber", "title", "body", "labels"];
  const json2csvParser = new Json2csvParser({ fields, unwind: "labels" });
  const csv = json2csvParser.parse(issues);
  fs.writeFileSync(file, csv);
}

module.exports = {
  retrieveIssues: retrieveIssues,
  getIssueInfo: getIssueInfo,
  makeCSV: makeCSV
};

if (module === require.main) {
  require(`yargs`)
    .demand(1)
    .command(
      `retrieveIssues <repoDataFilePath> <issuesDataFilePath>`,
      `Retrieve the current issue information from a json object of gitHub repositories.`,
      {},
      opts => {
        retrieveIssues(opts.repoDataFilePath, opts.issuesDataFilePath);
      }
    )
    .example(
      `$0 retrieveIssues repoData.json issuesData.csv`,
      `Retrieves issues from list of repos in repoData.json and saves the resulting information to issuesData.csv.`
    )
    .wrap(120)
    .recommendCommands()
    .epilogue(`For more information, contact....`)
    .help()
    .strict().argv;
}
