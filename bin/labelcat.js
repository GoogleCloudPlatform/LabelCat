#!/usr/bin/env node

const util = require('../src/util.js');

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
  .example(
    `$0 retrieveIssues repoData.txt issuesData.csv`,
    `Retrieves issues from list of repos in repoData.txt and saves the resulting information to issuesData.csv.`
  )
  .wrap(120)
  .recommendCommands()
  .help()
  .strict().argv;
