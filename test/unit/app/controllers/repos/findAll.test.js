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
    let repos, Repo, reqMock, resMock, RepoMock, ModelMock, mockRepo, mockRepo2;

    beforeEach(function () {
      Repo = container.get('Repo');
      reqMock = { query: { userKey: '4'} };
      resMock = container.get('resMock');
      RepoMock = {
        findAll: sinon.stub()
      }
      ModelMock = {
        getAll: sinon.stub()
      }
      mockRepo = {
        key: '1',
        userKey: '4',
        owner: { key: '2', login: 'foo' },
        get: sinon.stub(),
        set: sinon.stub(),
        toJSON: sinon.stub()
      };
      mockRepo2 = {
        key: '2',
        userKey: '4',
        owner: { key: '2', login: 'foo' },
        get: sinon.stub(),
        set: sinon.stub(),
        toJSON: sinon.stub()
      };
    });

    it('should return an empty array if there are no repos to be found', Promise.coroutine(function* () {
      RepoMock.findAll.returns(Promise.resolve([]));
      repos = container.get('repos', {
        Repo: RepoMock
      });
      yield repos.findAll(reqMock, resMock);

      assert.isTrue(RepoMock.findAll.calledOnce, 'Repo.findAll should have been called once');
      assert.deepEqual(RepoMock.findAll.firstCall.args[0], { userKey: '4' }, 'Repo.findAll should have been called with correct data');
      assert.isTrue(resMock.status.calledOnce, 'res.status should have been called once');
      assert.isTrue(resMock.status.calledWith(200), 'res.status should have been set to 200');
      assert.isTrue(resMock.json.calledOnce, 'res.json should have been called once');
      assert.deepEqual(resMock.json.firstCall.args[0], [], 'res.json should have been called with correct data');
      assert.isTrue(resMock.end.calledOnce, 'res.end should have been called once');
    }));

    it('should return the repos', Promise.coroutine(function* () {
      mockRepo.toJSON.returns(mockRepo);
      mockRepo2.toJSON.returns(mockRepo2);
      RepoMock.findAll.returns(Promise.resolve([mockRepo, mockRepo2]));
      ModelMock.getAll.returns(Promise.resolve([]));
      repos = container.get('repos', {
        Repo: RepoMock,
        Model: ModelMock
      });
      yield repos.findAll(reqMock, resMock);

      assert.isTrue(RepoMock.findAll.calledOnce, 'Repo.findAll should have been called once');
      assert.deepEqual(RepoMock.findAll.firstCall.args[0], { userKey: '4' }, 'Repo.findAll should have been called with correct data');
      assert.isTrue(ModelMock.getAll.calledTwice, 'Model.getAll should have been called twice');
      assert.deepEqual(ModelMock.getAll.firstCall.args[0], [], 'Model.getAll should have been called with correct data');
      assert.isTrue(resMock.status.calledOnce, 'res.status should have been called once');
      assert.isTrue(resMock.status.calledWith(200), 'res.status should have been set to 200');
      assert.isTrue(resMock.json.calledOnce, 'res.json should have been called once');
      assert.deepEqual(resMock.json.firstCall.args[0], [Repo.serializeRepo(mockRepo), Repo.serializeRepo(mockRepo2)], 'res.json should have been called with correct data');
      assert.isTrue(resMock.end.calledOnce, 'res.end should have been called once');
    }));

    it('should return the repos and their models', Promise.coroutine(function* () {
      mockRepo.modelKeys = ['2'];
      mockRepo.toJSON.returns(mockRepo);
      mockRepo2.modelKeys = ['3'];
      mockRepo2.toJSON.returns(mockRepo2);
      RepoMock.findAll.returns(Promise.resolve([mockRepo, mockRepo2]));
      ModelMock.getAll.onFirstCall().returns(Promise.resolve([{
        key: '2'
      }]));
      ModelMock.getAll.onSecondCall().returns(Promise.resolve([{
        key: '2'
      }]));
      repos = container.get('repos', {
        Repo: RepoMock,
        Model: ModelMock
      });
      yield repos.findAll(reqMock, resMock);

      assert.isTrue(RepoMock.findAll.calledOnce, 'Repo.findAll should have been called once');
      assert.deepEqual(RepoMock.findAll.firstCall.args[0], { userKey: '4' }, 'Repo.findAll should have been called with correct data');
      assert.isTrue(ModelMock.getAll.calledTwice, 'Model.getAll should have been called twice');
      assert.deepEqual(ModelMock.getAll.firstCall.args[0], [], 'Model.getAll should have been called with correct data');
      assert.isTrue(resMock.status.calledOnce, 'res.status should have been called once');
      assert.isTrue(resMock.status.calledWith(200), 'res.status should have been set to 200');
      assert.isTrue(resMock.json.calledOnce, 'res.json should have been called once');
      assert.deepEqual(resMock.json.firstCall.args[0], [Repo.serializeRepo(mockRepo), Repo.serializeRepo(mockRepo2)], 'res.json should have been called with correct data');
      assert.isTrue(resMock.end.calledOnce, 'res.end should have been called once');
    }));
  };
};