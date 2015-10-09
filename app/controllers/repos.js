// Copyright 2015, Google, Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

let crypto = require('crypto');

module.exports = function (dataset, prediction, config, github, Promise, container, Repo, logger, messages) {

  let Model = container.get('Model');

  let receivedHooks = [];

  function signBlob(key, blob) {
    return 'sha1=' + crypto.createHmac('sha1', key).update(blob).digest('hex');
  }

  return {
    /**
     * GET /api/repos/:id
     *
     * Retrieve a repo by id.
     */
    findOneById: Promise.coroutine(function* (req, res) {
      let results = yield Promise.all([
        github.findRepoById(req.user.data, req.params.id),
        Repo.findOneById(req.params.id)
      ]);

      // Array destructuring doesn't work yet
      let githubRepo = results[0];
      let datastoreRepo = results[1];

      // TODO: Check to make sure GitHub returned a repo

      if (!datastoreRepo) {
        return res.status(200).send(Repo.serializeRepo(githubRepo)).end();
      } else {
        let models = yield Model.getAll(datastoreRepo.get('modelIds') || []);
        datastoreRepo.set('models', models);
        return res.status(200).send(Repo.serializeRepo(datastoreRepo.toJSON())).end();
      }
    }),

    /**
     * GET /api/repos/search/:owner/:repo
     *
     * Search for a GitHub repo by owner name and repo name.
     */
    search: Promise.coroutine(function* (req, res) {
      let repo = github.searchForRepo(req.user.data, req.params.owner, req.params.repo);
      if (repo) {
        return res.status(200).send(Repo.serializeRepo(repo)).end();
      } else {
        return res.status(200).end();
      }
    }),

    /**
     * PUT /api/repos/:id
     *
     * Update a repo in the datastore.
     */
    updateOneById: Promise.coroutine(function* (req, res) {
      let repo = yield Repo.findOneById(req.params.id);

      if (!repo) {
        let githubRepo = yield github.findRepoById(req.user.data, req.params.id);
        repo = yield Repo.createOne(Repo.serializeRepo(githubRepo));
      }
      
      if (req.body.enabled && !repo.get('enabled')) {
        // repo is being enabled
        let hook = github.findOrCreateHook(repo.toJSON(), req.user.data);
        if (hook instanceof Error) {
          // temporarily ignore this
          // throw new Error('Repo missing or need access!');
          req.body.hookId = 9999999999;
        } else if (!hook) {
          throw new Error('Failed to find or create hook!');
        } else {
          req.body.hookId = hook.id;
        }
      } else if (req.body.enabled === false && repo.get('hookId')) {
        // repo is being disabled, remove the hook
        yield github.deleteHook(repo.toJSON(), req.user.data);
        req.body.hookId = 0;
      }

      repo.set('userId', req.user.data.id);
      repo.set(req.body);
      yield repo.save();
      return res.status(200).send(repo.toJSON()).end();
    }),

    /**
     * DELETE /api/repos/:id
     *
     * Delete a repo by id from the datastore.
     */
    destroyOneById: Promise.coroutine(function* (req, res) {
      yield Repo.destroyOneById(req.params.id);
      return res.status(204).end();
    }),

    /**
     * POST /api/repos/:id/hook
     *
     * GitHub posts to this endpoint whenever a webhook is triggered.
     */
    hook: Promise.coroutine(function* (req, res, next) {
      logger.info('received hook', req.params.id);
      // Verify GitHub's signature
      if (req.headers['x-hub-signature'] !== signBlob(config.github.webhookSecret, JSON.stringify(req.body))) {
        return res.status(403).end();
      } else if (req.body.action === 'opened' && req.body.issue) {
        let repo = yield Repo.findOneById(req.params.id);
        if (repo && repo.get('modelIds') && repo.get('modelIds').length) {
          let user = dataset.getAsync(dataset.key(['User', '' + repo.get('userId')]));
          let models = yield Model.getAll(repo.get('modelIds'));
          let example = prediction.createExample(req.body.issue);
          let results = yield Promise.all(models.map(Promise.coroutine(function* (model) {
            let results = yield prediction.predict(model.get('id'), example);
            
            // Array destructuring doesn't work yet
            let output = results[0];

            return {
              label: model.get('label'),
              predicted: parseInt(output.outputLabel, 10),
              predictions: {
                '0': parseFloat(output.outputMulti[0].score, 10),
                '1': parseFloat(output.outputMulti[1].score, 10)
              }
            };
          })));
          logger.info(results);
          receivedHooks.push(results);
          let labelsToAdd = results.filter(function (result) {
            return result.predicted;
          }).map(function (result) {
            return result.label;
          });
          if (labelsToAdd.length) {
            yield github.addLabelsToIssue(labelsToAdd, req.body.issue.number, repo.toJSON(), user.data);
            return res.status(200).send(results).end();
          } else {
            return res.status(200).send(results).end();
          }
        } else {
          return res.status(404).end();
        }
      } else {
        return res.status(200).end();
      }
    }),

    hooks(req, res, next) {
      return res.status(200).send(receivedHooks).end();
    }
  };
};