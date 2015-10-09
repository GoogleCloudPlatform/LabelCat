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

module.exports = function (container, assert, testRequest, Promise, createSessionCookie) {
  return function () {
    let app, Repo, userSession, githubApi;

    beforeEach(function () {
      app = container.get('app');
      Repo = container.get('Repo');
      userSession = container.get('userSession');
      githubApi = container.get('githubApi');
    });

    it('should return 401 if no authenticated user', Promise.coroutine(function* () {
      let response = yield testRequest(app)
                            .get('/api/user/repos')
                            .expect(401);

      assert.deepEqual(response.body, {}, 'Response body should be empty');
    }));

    it('should return repos accessible by the authenticated user', Promise.coroutine(function* () {
      let response = yield testRequest(app)
                            .get('/api/user/repos')
                            .set('Cookie', createSessionCookie(userSession))
                            .expect(200);

      assert.equal(
        response.body.length,
        githubApi.userRepos.length,
        'Response body should be repos of the authenticated user'
      );

      let repo = response.body[0];
      let matching = githubApi.userRepos.filter(function (_repo) {
        return repo.id == _repo.id;
      });
      let _repo = matching.length ? matching[0] : null;
      assert.deepEqual(repo, Repo.serializeRepo(_repo), 'Repos should have been serialized');
    }));
  };
};