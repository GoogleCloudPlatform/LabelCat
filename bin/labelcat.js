#!/usr/bin/env node

const util = require('../src/util.js');
const settings = require('../functions/settings.json'); // eslint-disable-line node/no-missing-require

require(`yargs`)
  .demand(1)
  .command(
    `retrieveIssues <repoDataFilePath> <issuesDataFilePath> <label>`,
    `Retrieves issues from a .txt file of gitHub repositories. Options: -a`,
    function(command) {
      command.options({
        alternatives: {
          alias: 'a',
          type: 'array',
          requiresArg: true,
          default: [],
        },
      });
    },
    async opts => {
      util.makeCSV(
        await util.retrieveIssues(
          opts.repoDataFilePath,
          opts.label,
          opts.alternatives
        ),
        opts.issuesDataFilePath
      );
    }
  )
  .command(
    `createDataset <datasetName>`,
    `Create a new Google AutoML NL dataset with the specified name. Options: -m`,
    function(command) {
      command.options({multilabel: {alias: 'm'}});
    },
    opts => {
      const projectId = settings.projectId;
      const computeRegion = settings.computeRegion;
      const datasetName = opts.datasetName;

      util.createDataset(
        projectId,
        computeRegion,
        datasetName,
        opts.multilabel
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
    `createModel <datasetId> <modelName>`,
    `Train an AutoML NL model using existing dataset.`,
    {},
    opts => {
      const projectId = settings.projectId;
      const computeRegion = settings.computeRegion;
      const datasetId = opts.datasetId;
      const modelName = opts.modelName;

      util.createModel(projectId, computeRegion, datasetId, modelName);
    }
  )
  .command(
    `listDatasets`,
    `Train an AutoML NL model using existing dataset.`,
    {},
    () => {
      const projectId = settings.projectId;
      const computeRegion = settings.computeRegion;

      util.listDatasets(projectId, computeRegion);
    }
  )
  .example(
    `$0 retrieveIssues repoData.txt issuesData.csv 'type: bug' -a 'bug' -a 'bugger'`,
    `Retrieves issues with matching labels from list of repos in repoData.txt and saves the resulting information to issuesData.csv.`
  )
  .example(
    `$0 createDataset Data`,
    `Creates a new multilabel dataset with the specified name.`
  )
  .example(
    `$0 importData gs://myproject/mytraindata.csv 1248102981`,
    `Imports the GitHub issues data into the dataset by specifying the file of issues data and the dataset ID.`
  )
  .example(
    `$0 createModel 1234543ABC234 firstModel`,
    `Trains an AutoML NL model using an existing dataset.`
  )
  .example(
    `$0 listDatasets`,
    `Lists all AutoML NL datasets for current Google Cloud Platform project.`
  )
  .wrap(120)
  .recommendCommands()
  .help()
  .strict().argv;
