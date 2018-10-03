#!/usr/bin/env node

const util = require('../src/util.js');
const settings = require('../settings.json');

require(`yargs`)
  .demand(1)
  .command(
    `retrieveIssues <repoDataFilePath> <issuesDataFilePath>`,
    `Retrieves issues from a .txt file of gitHub repositories.`,
    {},
    async opts => {
      util.makeCSV(
        await util.retrieveIssues(opts.repoDataFilePath),
        opts.issuesDataFilePath
      );
    }
  )
  .command(
    `createDataset <datasetName>`,
    `Create a new Google AutoML NL dataset with the specified name.`,
    function(command) {
      command.options({multiclass: {alias: 'm'}});
    },
    opts => {
      const projectId = settings.projectId;
      const computeRegion = settings.computeRegion;
      const datasetName = opts.datasetName;

      util.createDataset(
        projectId,
        computeRegion,
        datasetName,
        opts.multiclass
      );
    }
  )
  .command(
    `importData <issuesDataPath> <datasetId>`,
    `Import the GitHub issues data from Google Cloud Storage bucket into the Google AutoML NL dataset by specifying the file's path in the bucket and the dataset ID.`,
    {},
    opts => {
      const projectId = settings.projectId;
      const computeRegion = settings.computeRegion;
      const datasetId = opts.datasetId;
      const path = opts.issuesDataPath;

      util.importData(projectId, computeRegion, datasetId, path);
    }
  )
  .command(
    `fixCsv <issuesFile> <saveFile`,
    `Import the GitHub issues data from Google Cloud Storage bucket into the Google AutoML NL dataset by specifying the file's path in the bucket and the dataset ID.`,
    {},
    opts => {
      util.fix(opts.issuesFile, opts.saveFile);
    }
  )
  .example(
    `$0 retrieveIssues repoData.txt issuesData.csv`,
    `Retrieves issues from list of repos in repoData.txt and saves the resulting information to issuesData.csv.`
  )
  .example(
    `$0 createDataset Data`,
    `Creates a new multilabel dataset with the specified name.`
  )
  .example(
    `$0 importData gs://myproject/mytraindata.csv 1248102981`,
    `Imports the GitHub issues data into the dataset by specifying the file of issues data and the dataset ID.`
  )
  .wrap(120)
  .recommendCommands()
  .help()
  .strict().argv;
