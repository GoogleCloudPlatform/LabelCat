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

module.exports = function (prediction, config, Promise, container, logger, messages, Repo, Model, User, github) {

  let receivedHooks = [];

  function signBlob(key, blob) {
    return 'sha1=' + crypto.createHmac('sha1', key).update(blob).digest('hex');
  }

  return {
    /**
     * GET /api/repos/:key
     *
     * Retrieve a repo by key.
     */
    findOne: Promise.coroutine(function* (req, res) {
      let repo = yield Repo.findOne(req.params.key);

      if (!repo) {
        return res.status(200).end();
      } else {
        let models = yield Model.getAll(repo.get('modelKeys') || []);
        repo.set('models', models);
        return res.status(200).json(repo.toJSON()).end();
      }
    }),

    /**
     * GET /api/repos
     *
     * Retrieve a collection of repos.
     */
    findAll: Promise.coroutine(function* (req, res) {
      let repos = yield Repo.findAll(req.query);
      let models = yield Promise.all(repos.map(function (repo) {
        return Model.getAll(repo.get('modelKeys') || []);
      }));
      repos.forEach(function (repo, i) {
        repo.set('models', models[i]);
      })
      return res.status(200).json(repos.map(function (repo) {
        return repo.toJSON();
      })).end();
    }),

    /**
     * GET /api/repos/search/:owner/:repo
     *
     * Search for a GitHub repo by owner name and repo name.
     */
    search: Promise.coroutine(function* (req, res) {
      let repo = yield github.searchForRepo(req.user, req.params.owner, req.params.repo);
      if (repo) {
        return res.status(200).json(Repo.serializeRepo(repo)).end();
      } else {
        return res.status(200).end();
      }
    }),

    /**
     * PUT /api/repos/:key
     *
     * Update a repo in the datastore.
     */
    updateOne: Promise.coroutine(function* (req, res) {
      let repo;
      if (req.params.key === 'new') {
        let githubRepo = yield github.findRepoById(req.user, req.body.id);
        repo = new Repo(Repo.serializeRepo(githubRepo));
        yield repo.save();
      } else {
        repo = yield Repo.findOne(req.params.key);
      }
      
      if (req.body.enabled && !repo.get('enabled')) {
        req.body.userKey = req.user.get('key');
        req.body.userLogin = req.user.get('login');
        // repo is being enabled
        let hook = yield github.findOrCreateHook(repo.toJSON(), req.user);
        if (hook instanceof Error) {
          throw new Error('Repo missing or need access!');
        } else if (!hook) {
          throw new Error('Failed to find or create hook!');
        } else {
          req.body.hookId = hook.id;
        }
      } else if (req.body.enabled === false && repo.get('hookId')) {
        // repo is being disabled, remove the hook
        yield github.deleteHook(repo.toJSON(), req.user);
        req.body.hookId = 0;
      }

      repo.set(req.body);
      yield repo.save();
      return res.status(200).json(repo.toJSON()).end();
    }),

    /**
     * DELETE /api/repos/:key
     *
     * Remove a repo from the datastore.
     */
    destroyOne: Promise.coroutine(function* (req, res) {
      yield Repo.destroyOne(req.params.key);
      return res.status(204).end();
    }),

    /**
     * POST /api/repos/:key/hook
     *
     * GitHub posts to this endpoint whenever a webhook is triggered.
     */
    hook: Promise.coroutine(function* (req, res, next) {
      logger.info('received hook', req.params.key);
      // Verify GitHub's signature
      if (req.headers['x-hub-signature'] !== signBlob(config.github.webhookSecret, JSON.stringify(req.body))) {
        return res.status(403).end();
      } else if (req.body.action === 'opened' && req.body.issue) {
        let repo = yield Repo.findOne(req.params.key);
        if (repo && repo.get('modelKeys') && repo.get('modelKeys').length) {
          let user = yield User.findOne(repo.get('userKey'));
          let models = yield Model.getAll(repo.get('modelKeys'));
          let example = prediction.createExample(req.body.issue);
          let results = yield Promise.all(models.map(Promise.coroutine(function* (model) {
            let results = yield prediction.predict(model.get('key'), example);
            
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
            yield github.addLabelsToIssue(labelsToAdd, req.body.issue.number, repo.toJSON(), user);
            return res.status(200).json(results).end();
          } else {
            return res.status(200).json(results).end();
          }
        } else {
          return res.status(404).end();
        }
      } else {
        return res.status(200).end();
      }
    }),

    hooks(req, res, next) {
      return res.status(200).json(receivedHooks).end();
    }
  };
};