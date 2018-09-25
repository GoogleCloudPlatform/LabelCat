'use strict';

const axios = require('axios');
const fs = require('fs');
const settings = require('../settings.json'); // eslint-disable-line node/no-missing-require
const Json2csvParser = require('json2csv').Parser;
const log = require('loglevel');
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
      let repo = reposArray[i];
      const githubClientID = settings.githubClientID;
      const githubClientSecret = settings.githubClientSecret;

      let url = `https://api.github.com/repos/${repo}/issues?state=all&per_page=100&client_id=${githubClientID}&client_secret=${githubClientSecret}`;

      const response = await axios.get(url);

      const issuesArray = response.data;
      const results = issuesArray.map(issue => getIssueInfo(issue));

      results.forEach(function(issue) {
        issueResults.push(issue);
      });
    }
    return issueResults;
  } catch (error) {
    log.warn(
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
    return {
      repository_url: issue.repository_url,
      title: issue.title,
      body: issue.body,
      labels: issue.labels.map(labelObject => labelObject.name),
    };
  } catch (error) {
    log.warn(
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
    const fields = ['repositoryUrl', 'title', 'body', 'labels'];
    const json2csvParser = new Json2csvParser({fields, unwind: 'labels'});
    const csv = json2csvParser.parse(issues);
    fs.appendFileSync(file, csv);
  } catch (error) {
    log.warn('ERROR WRITING ISSUES DATA TO CSV.');
  }
}

module.exports = {
  retrieveIssues: retrieveIssues,
  getIssueInfo: getIssueInfo,
  makeCSV: makeCSV,
};
