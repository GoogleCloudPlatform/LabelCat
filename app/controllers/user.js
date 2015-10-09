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

module.exports = function (Promise, github, config, Repo) {

  return {
    /**
     * GET /api/user
     *
     * Return the currently authenticated user, if any.
     */
    user: function (req, res) {
      if (req.isAuthenticated()) {
        return res.status(200).send({
          id: req.user.data.id,
          login: req.user.data.login,
          avatar_url: req.user.data.avatar_url
        }).end();
      } else {
        return res.status(200).end();
      }
    },

    /**
     * GET /api/user/repos
     *
     * Return the repos the currently authenticated user has access to,
     * according to the scope of the current access token.
     */
    repos: Promise.coroutine(function* (req, res) {
      let repos = yield github.getReposForUser(req.user.data, 1);
      if (typeof config.github.ownerRestriction === 'string') {
        repos = repos.filter(function (repo) {
          return repo.owner.login === config.github.ownerRestriction;
        });
      }
      return res.status(200).send(repos.map(Repo.serializeRepo)).end();
    })
  };
};