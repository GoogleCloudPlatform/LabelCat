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
    let repos, Repo, reqMock, resMock, RepoMock, ModelMock, mockRepo;

    beforeEach(function () {
      Repo = container.get('Repo');
      reqMock = { params: { key: '1'} };
      resMock = container.get('resMock');
      RepoMock = {
        findOne: sinon.stub()
      }
      ModelMock = {
        getAll: sinon.stub()
      }
      mockRepo = {
        key: '1',
        owner: { key: '2', login: 'foo' },
        get: sinon.stub(),
        set: sinon.stub(),
        toJSON: sinon.stub()
      };
    });

    it('should return nothing if the repo is not in the datastore', Promise.coroutine(function* () {
      RepoMock.findOne.returns(Promise.resolve());
      repos = container.get('repos', {
        Repo: RepoMock
      });
      yield repos.findOne(reqMock, resMock);

      assert.isTrue(RepoMock.findOne.calledOnce, 'Repo.findOne should have been called once');
      assert.deepEqual(RepoMock.findOne.firstCall.args[0], '1', 'Repo.findOne should have been called with correct data');
      assert.isTrue(resMock.status.calledOnce, 'res.status should have been called once');
      assert.isTrue(resMock.status.calledWith(200), 'res.status should have been set to 200');
      assert.isTrue(resMock.end.calledOnce, 'res.end should have been called once');
    }));

    it('should return the repo', Promise.coroutine(function* () {
      mockRepo.toJSON.returns(mockRepo);
      RepoMock.findOne.returns(Promise.resolve(mockRepo));
      ModelMock.getAll.returns(Promise.resolve([]));
      repos = container.get('repos', {
        Repo: RepoMock,
        Model: ModelMock
      });
      yield repos.findOne(reqMock, resMock);

      assert.isTrue(RepoMock.findOne.calledOnce, 'Repo.findOne should have been called once');
      assert.deepEqual(RepoMock.findOne.firstCall.args[0], '1', 'Repo.findOne should have been called with correct data');
      assert.isTrue(ModelMock.getAll.calledOnce, 'Model.getAll should have been called once');
      assert.deepEqual(ModelMock.getAll.firstCall.args[0], [], 'Model.getAll should have been called with correct data');
      assert.isTrue(resMock.status.calledOnce, 'res.status should have been called once');
      assert.isTrue(resMock.status.calledWith(200), 'res.status should have been set to 200');
      assert.isTrue(resMock.json.calledOnce, 'res.json should have been called once');
      assert.deepEqual(resMock.json.firstCall.args[0], Repo.serializeRepo(mockRepo), 'res.json should have been called with correct data');
      assert.isTrue(resMock.end.calledOnce, 'res.end should have been called once');
    }));

    it('should return the repo and its models', Promise.coroutine(function* () {
      mockRepo.modelKeys = ['2'];
      mockRepo.toJSON.returns(mockRepo);
      RepoMock.findOne.returns(Promise.resolve(mockRepo));
      ModelMock.getAll.returns(Promise.resolve([{
        key: '2'
      }]));
      repos = container.get('repos', {
        Repo: RepoMock,
        Model: ModelMock
      });
      yield repos.findOne(reqMock, resMock);

      assert.isTrue(RepoMock.findOne.calledOnce, 'Repo.findOne should have been called once');
      assert.deepEqual(RepoMock.findOne.firstCall.args[0], '1', 'Repo.findOne should have been called with correct data');
      assert.isTrue(ModelMock.getAll.calledOnce, 'Model.getAll should have been called once');
      assert.deepEqual(ModelMock.getAll.firstCall.args[0], [], 'Model.getAll should have been called with correct data');
      assert.isTrue(resMock.status.calledOnce, 'res.status should have been called once');
      assert.isTrue(resMock.status.calledWith(200), 'res.status should have been set to 200');
      assert.isTrue(resMock.json.calledOnce, 'res.json should have been called once');
      assert.deepEqual(resMock.json.firstCall.args[0], Repo.serializeRepo(mockRepo), 'res.json should have been called with correct data');
      assert.isTrue(resMock.end.calledOnce, 'res.end should have been called once');
    }));
  };
};