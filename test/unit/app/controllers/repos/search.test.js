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
    let repos, Repo, reqMock, resMock, githubMock, mockRepo;

    beforeEach(function () {
      Repo = container.get('Repo');
      reqMock = { params: { owner: 'foo', repo: 'bar' }, user: {} };
      resMock = container.get('resMock');
      githubMock = {
        searchForRepo: sinon.stub()
      }
      mockRepo = {
        key: '1',
        userKey: '4',
        owner: { key: '2', login: 'foo' },
        get: sinon.stub(),
        set: sinon.stub(),
        toJSON: sinon.stub().returnsThis()
      };
    });

    it('should return an empty body if the repo cannot be found', Promise.coroutine(function* () {
      githubMock.searchForRepo.returns(Promise.resolve());
      repos = container.get('repos', {
        github: githubMock
      });
      yield repos.search(reqMock, resMock);

      assert.isTrue(githubMock.searchForRepo.calledOnce, 'githubMock.searchForRepo should have been called once');
      assert.deepEqual(githubMock.searchForRepo.firstCall.args, [{}, 'foo', 'bar'], 'githubMock.searchForRepo should have been called with correct data');
      assert.isTrue(resMock.status.calledOnce, 'res.status should have been called once');
      assert.isTrue(resMock.status.calledWith(200), 'res.status should have been set to 200');
      assert.isFalse(resMock.json.called, 'res.json should not have been called');
      assert.isTrue(resMock.end.calledOnce, 'res.end should have been called once');
    }));

    it('should return the repos', Promise.coroutine(function* () {
      githubMock.searchForRepo.returns(Promise.resolve(mockRepo));
      repos = container.get('repos', {
        github: githubMock
      });
      yield repos.search(reqMock, resMock);

      assert.isTrue(githubMock.searchForRepo.calledOnce, 'githubMock.searchForRepo should have been called once');
      assert.deepEqual(githubMock.searchForRepo.firstCall.args, [{}, 'foo', 'bar'], 'githubMock.searchForRepo should have been called with correct data');
      assert.isTrue(resMock.status.calledOnce, 'res.status should have been called once');
      assert.isTrue(resMock.status.calledWith(200), 'res.status should have been set to 200');
      assert.isTrue(resMock.json.calledOnce, 'res.json should have been called once');
      assert.deepEqual(resMock.json.firstCall.args, [Repo.serializeRepo(mockRepo)], 'res.json should have been called with the correct data');
      assert.isTrue(resMock.end.calledOnce, 'res.end should have been called once');
    }));
  };
};