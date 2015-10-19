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

module.exports = function (container, assert, Promise, sinon) {
  return function () {
    let user, reqMock, resMock, githubMock, Repo, mockRepo, mockRepo2;

    beforeEach(function () {
      reqMock = { user: {} };
      resMock = container.get('resMock');
      githubMock = {
        getReposForUser: sinon.stub()
      }
      Repo = container.get('Repo');
      mockRepo = {
        key: '1',
        owner: { key: '2', login: 'foo' }
      };
      mockRepo2 = {
        key: '2',
        owner: { key: '3', login: 'bar' }
      };
    });

    it('should return the repos of the authenticated user', Promise.coroutine(function* () {
      githubMock.getReposForUser.returns(Promise.resolve([mockRepo]));
      user = container.get('user', {
        github: githubMock
      });
      yield user.repos(reqMock, resMock);

      assert.isTrue(resMock.status.calledOnce, 'res.status should have been called once');
      assert.isTrue(resMock.status.calledWith(200), 'res.status should have been set to 200');
      assert.isTrue(resMock.json.calledOnce, 'res.json should have been called once');
      assert.deepEqual(resMock.json.firstCall.args[0], [Repo.serializeRepo(mockRepo)], 'res.json should have been called with correct data');
      assert.isTrue(resMock.end.calledOnce, 'res.end should have been called once');
    }));

    it('should restrict repos if config.github.ownerRestriction is set', Promise.coroutine(function* () {
      githubMock.getReposForUser.returns(Promise.resolve([mockRepo, mockRepo2]));
      user = container.get('user', {
        github: githubMock,
        config: {
          github: {
            ownerRestriction: 'bar'
          }
        }
      });
      yield user.repos(reqMock, resMock);

      assert.isTrue(resMock.status.calledOnce, 'res.status should have been called once');
      assert.isTrue(resMock.status.calledWith(200), 'res.status should have been set to 200');
      assert.isTrue(resMock.json.calledOnce, 'res.json should have been called once');
      assert.deepEqual(resMock.json.firstCall.args[0], [Repo.serializeRepo(mockRepo2)], 'res.json should have been called with correct data');
      assert.isTrue(resMock.end.calledOnce, 'res.end should have been called once');
    }));
  };
};