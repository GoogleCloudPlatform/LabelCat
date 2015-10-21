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

module.exports = function (container, config, Promise, request) {

  function api(user) {
    // Dynamic resolution of dependency, otherwise mocking "githubApi" in tests
    // would be harder
    let githubApi = container.get('githubApi');
    githubApi.authenticate({
      type: 'oauth',
      token: user.get('access_token')
    });
    return githubApi;
  }

  // GitHub errors don't have stack traces. This generates error handlers that
  // wrap GitHub errors with stack traces.
  function getHandler(name) {
    return function githubErrorHandler(err) {
      if (err.stack) {
        return Promise.reject(err);
      } else {
        let message = err.message;
        try {
          message = JSON.parse(message);
        } catch (err) {

        }
        throw new Error(`${name}:${message.message || err.message}`);
      }
    };
  }

  // I purposefully did not promisify the githubApi
  // because of the way its synchronous authentication
  // has been implemented. githubApi is a singleton,
  // and the forced asynchronous execution introduced
  // by promisification means global state might be
  // accessed out of order by different requests.

  /**
   * List all webhooks for the given repository.
   *
   * @private
   *
   * @param {object=} repo - Repository for which to list all webhooks.
   * @param {object=} user - Logged-in user.
   * @param {number=} page - Page of results to retrieve.
   */
  function listHooks(repo, user, page) {
    return new Promise(function (resolve, reject) {
      api(user).repos.getHooks({
        repo: repo.name,
        user: repo.owner.login,
        per_page: 100,
        page: page
      }, function (err, hooks) {
        if (err) {
          return reject(err);
        } else if (hooks.length === 100) {
          listHooks(user, repo, page + 1).then(function (hooks2) {
            return resolve(hooks.concat(hooks2));
          }).catch(reject);
        } else {
          return resolve(hooks);
        }
      });
    }).catch(getHandler('listHooks'));
  }

  /**
   * Create the LabelCat webhook for the given repository.
   *
   * @private
   *
   * @param {object=} repo - Repository for which to create the webhook.
   * @param {object=} user - Logged-in user.
   */
  function createHook(repo, user) {
    return new Promise(function (resolve, reject) {
      api(user).repos.createHook({
        active: true,
        repo: repo.name,
        user: repo.owner.login,
        name: 'web',
        events: [
          'issues'
        ],
        config: {
          url: `https://${config.gcloud.projectId}.appspot.com/api/repos/${repo.key}/hook`,
          content_type: 'json',
          secret: config.github.webhookSecret
        }
      }, function (err, response) {
        if (err) {
          return reject(err);
        } else {
          return resolve(response);
        }
      });
    }).catch(getHandler('createHook'));
  }

  return {
    /**
     * Retrieve the repo with the given id.
     * http://mikedeboer.github.io/node-github/#repos.prototype.one
     *
     * @private
     *
     * @param {object=} user - Logged-in user, the user retrieving the repo.
     * @param {number=} id - Id of the repo to retrieve.
     */
    findRepoById(user, id) {
      return new Promise(function (resolve, reject) {
        api(user).repos.one({
          id: id
        }, function (err, repo) {
          if (err) {
            return reject(err);
          } else {
            return resolve(repo);
          }
        });
      }).catch(getHandler('findRepoById'));
    },

    /**
     * Search for a repo by owner name and repo name.
     * http://mikedeboer.github.io/node-github/#repos.prototype.get
     *
     * @private
     *
     * @param {object=} user - Logged-in user, the user searching for the repo.
     * @param {string=} login - The name of the owner of the repo to search for.
     * @param {string=} name - The name of the repo to search for.
     */
    searchForRepo(user, login, name) {
      return new Promise(function (resolve, reject) {
        api(user).repos.get({
          user: login,
          repo: name
        }, function (err, repo) {
          if (err && (!err.code || err.code !== 404)) {
            return reject(err);
          } else {
            return resolve(repo);
          }
        });
      }).catch(getHandler('searchForRepo'));
    },

    /**
     * Get the orgs for the given user.
     * http://mikedeboer.github.io/node-github/#user.prototype.getOrgs
     *
     * @private
     *
     * @param {object=} user - Logged-in user.
     */
    getOrgsForUser(user) {
      return new Promise(function (resolve, reject) {
        api(user).user.getOrgs({
          per_page: 100
        }, function (err, repo) {
          if (err && (!err.code || err.code !== 404)) {
            return reject(err);
          } else {
            return resolve(repo);
          }
        });
      }).catch(getHandler('getOrgsForUser'));
    },

    /**
     * List all repositories for the given user that the user has some sort of
     * write access to.
     * See https://developer.github.com/v3/repos/#list-your-repositories
     *
     * @param {object=} user - User for which to list all repositories.
     * @param {number=} page - Page of results to retrieve.
     */
    getReposForUser(user, page) {
      return new Promise((resolve, reject) => {
        api(user).repos.getAll({
          type: 'all',
          page: page,
          per_page: 100
        }, (err, repos) => {
          if (err) {
            return reject(err);
          } else if (repos.length === 100) {
            this.getReposForUser(user, page + 1).then(function (repos2) {
              return resolve(repos.concat(repos2));
            }).catch(reject);
          } else {
            return resolve(repos);
          }
        });
      }).catch(getHandler('getReposForUser'));
    },

    /**
     * List all issues for the given repository.
     *
     * @param {object=} repo - Repository for which to list all issues.
     * @param {object=} user - Logged-in user.
     * @param {number=} page - Page of results to retrieve.
     */
    getIssuesForRepo(user, repo, page) {
      return new Promise((resolve, reject) => {
        api(user).issues.repoIssues({
          user: repo.owner.login,
          repo: repo.name,
          state: 'all',
          per_page: 100,
          page: page
        }, (err, issues) => {
          if (err) {
            return reject(err);
          } else if (issues.length === 100) {
            this.getIssuesForRepo(user, repo, page + 1).then(function (issues2) {
              return resolve(issues.concat(issues2));
            }).catch(reject);
          } else {
            return resolve(issues);
          }
        });
      }).catch(getHandler('getIssuesForRepo'));
    },

    /**
     * Find or create the LabelCat webhook for the given repository.
     *
     * @param {object=} repo - Repository for which to find or create the webhook.
     * @param {object=} user - Logged-in user.
     */
    findOrCreateHook(repo, user) {
      return createHook(repo, user).catch(function (err) {
        if (err && err.message === 'createHook: Validation Failed') {
          // Hook already exists, so return the existing one
          return listHooks(repo, user, 1).then(function (hooks) {
            let hook;
            let testUrl = `https://${config.gcloud.projectId}.appspot.com/api/repos/${repo.key}/hook`;
            hooks.forEach(function (_hook) {
              if (_hook.config && _hook.config.url && _hook.config.url === testUrl) {
                hook = _hook;
                return false;
              }
            });
            if (!hook) {
              return Promise.reject(err);
            } else {
              return hook;
            }
          });
        } else if (err && err.message === 'createHook: Not Found') {
          return err;
        } else {
          return Promise.reject(err);
        }
      }).catch(getHandler('findOrCreateHook'));
    },

    /**
     * Delete the LabelCat webhook for the given repository.
     *
     * @param {object=} repo - Repository from which to delete the webhook.
     * @param {object=} user - Logged-in user.
     */
    deleteHook(repo, user) {
      return new Promise(function (resolve, reject) {
        api(user).repos.deleteHook({
          user: repo.owner.login,
          repo: repo.name,
          id: repo.hookId
        }, function (err, response) {
          if (err) {
            return reject(err);
          } else {
            return resolve(response);
          }
        });
      }).catch(getHandler('deleteHook'));
    },

    /**
     * Add the given labels to the specified issue.
     *
     * @param {array} labels - Labels to be added to the issue.
     * @param {number} number - Number of the issue to which to add the labels.
     * @param {object} repo - Repository of the issue.
     * @param {object} user - Logged-in user.
     */
    addLabelsToIssue(labels, number, repo, user) {
      return request({
        url: `https://api.github.com/repos/${repo.owner.login}/${repo.name}/issues/${number}/labels`,
        method: 'POST',
        qs: {
          access_token: user.get('access_token')
        },
        body: labels,
        json: true,
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'LabelCat'
        }
      }).spread(function (response, body) {
        return body;
      }).catch(getHandler('addLabelsToIssue'));
    }
  };
};