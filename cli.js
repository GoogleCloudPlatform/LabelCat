#!/usr/bin/env node

'use strict';

const axios = require('axios');
const async = require("async");
const fs = require('fs');
// const argv = require('yargs').argv;
const settings = require('./settings.json')
const Json2csvParser = require('json2csv').Parser;

require(`yargs`)
  .demand(1)
  .command(
    `retrieveIssues <repoData> <issuesData>`,
    `Retrieve the current issue information from a list of gitHub repositories.`,
    {},
    opts => {
      retrieveIssues(opts.repoData, opts.issuesData)
    }
  )
  .example(`$0 retrieveIssues repoData.json issuesData.csv`, `Retrieves issues from list of repos in repoData.json and saves the resulting information to issuesData.csv.`)
  .wrap(120)
  .recommendCommands()
  .epilogue(`For more information, say hay`)
  .help()
  .strict().argv;


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


  // retrieveIssues()

  // // labelcat-retrieveIssues -r repoData.csv -i issuesData.csv
  // const argv = require('yargs')
  //   .usage('Usage: $0 -r <repoData> -i <issuesData>\n e.g $0 -r repoData.csv -i issuesData.csv')
  //   .alias({'r': 'repos', 'i': 'issues'})
  //   .nargs({'r': 1, 'i': 1})
  //   .describe({'r': 'List of repos to pull issues from', 'i': 'File to save issue data'})
  //   .demandOption(['r', 'i'])
  //   .help('h')
  //   .alias('h', 'help')
  //   // .epilog('Copyright Abdul 2017')
  //   .argv
