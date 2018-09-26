#!/usr/bin/env node

const util = require('../src/util.js');
const settings = require('../settings.json');

require(`yargs`)
  .demand(1)
  .command(
    `retrieveIssues <repoDataFilePath> <issuesDataFilePath>`,
    `Retrieves issues from a .txt file of gitHub repositories.`,
    {},
    async (opts) => {
      util.makeCSV(
        await util.retrieveIssues(opts.repoDataFilePath),
        opts.issuesDataFilePath
      );
    }
  )
  .command(
    `createDataset <datasetName> [multilabel]`,
    `Create a new Google AutoML NL dataset with the specified name.`,
    {},
    opts => {
      const projectId = settings.projectId;
      const computeRegion = settings.computeRegion;
      const datasetName = opts.datasetName;
      const multiLabel = opts.multilabel;

      util.createDataset(projectId, computeRegion, datasetName, multiLabel)
    }
  )
  .example(
    `$0 retrieveIssues repoData.txt issuesData.csv`,
    `Retrieves issues from list of repos in repoData.txt and saves the resulting information to issuesData.csv.`
  )
  .example(`$0 createDataset Data`, `Creates a new dataset with the specified name.`)
  .wrap(120)
  .recommendCommands()
  .help()
  .strict().argv;
