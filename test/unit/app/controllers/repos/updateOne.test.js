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
    let repos, Repo, reqMock, resMock, mockRepo;

    beforeEach(function () {
      Repo = container.get('Repo');
      resMock = container.get('resMock');
      mockRepo = {
        id: 1,
        key: '1',
        owner: { key: '2', id: 2, login: 'foo' },
        get: sinon.stub(),
        set: sinon.stub(),
        toJSON: sinon.stub().returnsThis(),
        save: sinon.stub()
      };
    });

    it('should create a new repo if the repo is new', Promise.coroutine(function* () {
      reqMock = { params: { key: 'new'}, user: { key: '4' }, body: { id: 1 } };
      mockRepo.save.returns(Promise.resolve(mockRepo));
      let githubMock = {
        findRepoById: sinon.stub().returns(Promise.resolve(mockRepo))
      };
      let RepoMock = function () {
        this.save = sinon.stub().returns(Promise.resolve(mockRepo));
        return mockRepo;
      };
      RepoMock.serializeRepo = sinon.stub().returnsArg(0);
      repos = container.get('repos', {
        github: githubMock,
        Repo: RepoMock
      });
      yield repos.updateOne(reqMock, resMock);

      assert.isTrue(githubMock.findRepoById.calledOnce, 'github.findRepoById should have been called once');
      assert.deepEqual(githubMock.findRepoById.firstCall.args, [{ key: '4' }, 1], 'github.findRepoById should have been called with correct data');
      assert.isTrue(resMock.status.calledOnce, 'res.status should have been called once');
      assert.isTrue(resMock.status.calledWith(200), 'res.status should have been set to 200');
      assert.isTrue(mockRepo.save.calledTwice, 'repo.save should have been called twice');
      assert.isTrue(mockRepo.set.calledOnce, 'repo.set should have been called once');
      assert.deepEqual(mockRepo.set.firstCall.args, [reqMock.body], 'repo.set should have been called with the correct data');
      assert.isTrue(mockRepo.toJSON.calledOnce, 'repo.toJSON should have been called once');
      assert.isTrue(resMock.json.calledOnce, 'res.json should have been called once');
      assert.deepEqual(resMock.json.firstCall.args, [mockRepo], 'res.json should have been called with the correct data');
      assert.isTrue(resMock.end.calledOnce, 'res.end should have been called once');
    }));

    it('should return the existing repo', Promise.coroutine(function* () {
      reqMock = { params: { key: '1'}, user: { key: '4' }, body: { id: 1, key: '1' } };
      mockRepo.save.returns(Promise.resolve(mockRepo));
      let RepoMock = {
        findOne: sinon.stub().returns(Promise.resolve(mockRepo))
      };
      RepoMock.serializeRepo = sinon.stub().returnsArg(0);
      repos = container.get('repos', {
        Repo: RepoMock
      });
      yield repos.updateOne(reqMock, resMock);

      assert.isTrue(RepoMock.findOne.calledOnce, 'Repo.findOne should have been called once');
      assert.deepEqual(RepoMock.findOne.firstCall.args, ['1'], 'Repo.findOne should have been called with correct data');
      assert.isTrue(resMock.status.calledOnce, 'res.status should have been called once');
      assert.isTrue(resMock.status.calledWith(200), 'res.status should have been set to 200');
      assert.isTrue(mockRepo.save.calledOnce, 'repo.save should have been called once');
      assert.isTrue(mockRepo.set.calledOnce, 'repo.set should have been called once');
      assert.deepEqual(mockRepo.set.firstCall.args, [reqMock.body], 'repo.set should have been called with the correct data');
      assert.isTrue(mockRepo.toJSON.calledOnce, 'repo.toJSON should have been called once');
      assert.isTrue(resMock.json.calledOnce, 'res.json should have been called once');
      assert.deepEqual(resMock.json.firstCall.args, [mockRepo], 'res.json should have been called with the correct data');
      assert.isTrue(resMock.end.calledOnce, 'res.end should have been called once');
    }));

    it('should throw an error if insufficent permissions for creating a hook', Promise.coroutine(function* () {
      reqMock = { params: { key: '1' }, user: { key: '4', get: sinon.stub().returnsArg(0) }, body: { id: 1, enabled: true } };
      mockRepo.save.returns(Promise.resolve(mockRepo));
      let githubMock = {
        findOrCreateHook: sinon.stub().returns(Promise.reject(new Error('foo')))
      };
      let RepoMock = {
        findOne: sinon.stub().returns(Promise.resolve(mockRepo))
      };
      RepoMock.serializeRepo = sinon.stub().returnsArg(0);
      repos = container.get('repos', {
        github: githubMock,
        Repo: RepoMock
      });
      try {
        yield repos.updateOne(reqMock, resMock);
        throw new Error('should not have reached here!');
      } catch (err) {
        assert.equal(err.message, 'foo', 'error should have been thrown');
      }

      assert.isTrue(RepoMock.findOne.calledOnce, 'Repo.findOne should have been called once');
      assert.deepEqual(RepoMock.findOne.firstCall.args, ['1'], 'Repo.findOne should have been called with correct data');
      assert.isTrue(githubMock.findOrCreateHook.calledOnce, 'github.findOrCreateHook should have been called once');
      assert.isTrue(mockRepo.toJSON.calledOnce, 'repo.toJSON should have been called once');
      assert.deepEqual(githubMock.findOrCreateHook.firstCall.args, [mockRepo.toJSON(), reqMock.user], 'github.findOrCreateHook should have been called with correct data');
      assert.isFalse(resMock.status.called, 'res.status should not have been called');
      assert.isFalse(mockRepo.save.called, 'repo.save should not have been called');
      assert.isFalse(mockRepo.set.called, 'repo.set should not have been called');
      assert.isFalse(resMock.json.called, 'res.json should not have been called');
      assert.isFalse(resMock.end.called, 'res.end should not have been called');
    }));

    it('should throw an error on failure to create hook', Promise.coroutine(function* () {
      reqMock = { params: { key: '1' }, user: { key: '4', get: sinon.stub().returnsArg(0) }, body: { id: 1, enabled: true } };
      mockRepo.save.returns(Promise.resolve(mockRepo));
      let githubMock = {
        findOrCreateHook: sinon.stub().returns(Promise.resolve(null))
      };
      let RepoMock = {
        findOne: sinon.stub().returns(Promise.resolve(mockRepo))
      };
      RepoMock.serializeRepo = sinon.stub().returnsArg(0);
      repos = container.get('repos', {
        github: githubMock,
        Repo: RepoMock
      });
      try {
        yield repos.updateOne(reqMock, resMock);
        throw new Error('should not have reached here!');
      } catch (err) {
        assert.equal(err.message, 'Failed to find or create hook!', 'error should have been thrown');
      }

      assert.isTrue(RepoMock.findOne.calledOnce, 'Repo.findOne should have been called once');
      assert.deepEqual(RepoMock.findOne.firstCall.args, ['1'], 'Repo.findOne should have been called with correct data');
      assert.isTrue(githubMock.findOrCreateHook.calledOnce, 'github.findOrCreateHook should have been called once');
      assert.isTrue(mockRepo.toJSON.calledOnce, 'repo.toJSON should have been called once');
      assert.deepEqual(githubMock.findOrCreateHook.firstCall.args, [mockRepo.toJSON(), reqMock.user], 'github.findOrCreateHook should have been called with correct data');
      assert.isFalse(resMock.status.called, 'res.status should not have been called');
      assert.isFalse(mockRepo.save.called, 'repo.save should not have been called');
      assert.isFalse(mockRepo.set.called, 'repo.set should not have been called');
      assert.isFalse(resMock.json.called, 'res.json should not have been called');
      assert.isFalse(resMock.end.called, 'res.end should not have been called');
    }));

    it('should create a hook', Promise.coroutine(function* () {
      reqMock = { params: { key: '1' }, user: { key: '4', get: sinon.stub().returnsArg(0) }, body: { id: 1, enabled: true } };
      mockRepo.save.returns(Promise.resolve(mockRepo));
      let githubMock = {
        findOrCreateHook: sinon.stub().returns(Promise.resolve({ id: 99 }))
      };
      let RepoMock = {
        findOne: sinon.stub().returns(Promise.resolve(mockRepo))
      };
      RepoMock.serializeRepo = sinon.stub().returnsArg(0);
      repos = container.get('repos', {
        github: githubMock,
        Repo: RepoMock
      });
      yield repos.updateOne(reqMock, resMock);

      assert.isTrue(RepoMock.findOne.calledOnce, 'Repo.findOne should have been called once');
      assert.deepEqual(RepoMock.findOne.firstCall.args, ['1'], 'Repo.findOne should have been called with correct data');
      assert.isTrue(githubMock.findOrCreateHook.calledOnce, 'github.findOrCreateHook should have been called once');
      assert.isTrue(mockRepo.toJSON.calledTwice, 'repo.toJSON should have been called twice');
      assert.deepEqual(githubMock.findOrCreateHook.firstCall.args, [mockRepo.toJSON(), reqMock.user], 'github.findOrCreateHook should have been called with correct data');
      assert.isTrue(resMock.status.calledOnce, 'res.status should have been called once');
      assert.isTrue(resMock.status.calledWith(200), 'res.status should have been set to 200');
      assert.isTrue(mockRepo.save.calledOnce, 'repo.save should have been called once');
      assert.isTrue(mockRepo.set.calledOnce, 'repo.set should have been called once');
      assert.deepEqual(mockRepo.set.firstCall.args, [reqMock.body], 'repo.set should have been called with the correct data');
      assert.isTrue(resMock.json.calledOnce, 'res.json should have been called once');
      assert.deepEqual(resMock.json.firstCall.args, [mockRepo], 'res.json should have been called with the correct data');
      assert.isTrue(resMock.end.calledOnce, 'res.end should have been called once');
      assert.equal(reqMock.body.hookId, 99, 'req.body.hookId should have been set correctly');
    }));

    it('should remove a hook', Promise.coroutine(function* () {
      reqMock = { params: { key: '1' }, user: { key: '4', get: sinon.stub().returnsArg(0) }, body: { id: 1, enabled: false } };
      mockRepo.hookId = 99;
      mockRepo.enabled = true;
      mockRepo.get.withArgs('enabled').returns(mockRepo.enabled);
      mockRepo.get.withArgs('hookId').returns(mockRepo.hookId);
      mockRepo.save.returns(Promise.resolve(mockRepo));
      let githubMock = {
        deleteHook: sinon.stub().returns(Promise.resolve())
      };
      let RepoMock = {
        findOne: sinon.stub().returns(Promise.resolve(mockRepo))
      };
      RepoMock.serializeRepo = sinon.stub().returnsArg(0);
      repos = container.get('repos', {
        github: githubMock,
        Repo: RepoMock
      });
      yield repos.updateOne(reqMock, resMock);

      assert.isTrue(RepoMock.findOne.calledOnce, 'Repo.findOne should have been called once');
      assert.deepEqual(RepoMock.findOne.firstCall.args, ['1'], 'Repo.findOne should have been called with correct data');
      assert.isTrue(githubMock.deleteHook.calledOnce, 'github.deleteHook should have been called once');
      assert.isTrue(mockRepo.toJSON.calledTwice, 'repo.toJSON should have been called twice');
      assert.deepEqual(githubMock.deleteHook.firstCall.args, [mockRepo.toJSON(), reqMock.user], 'github.deleteHook should have been called with correct data');
      assert.isTrue(resMock.status.calledOnce, 'res.status should have been called once');
      assert.isTrue(resMock.status.calledWith(200), 'res.status should have been set to 200');
      assert.isTrue(mockRepo.save.calledOnce, 'repo.save should have been called once');
      assert.isTrue(mockRepo.set.calledOnce, 'repo.set should have been called once');
      assert.deepEqual(mockRepo.set.firstCall.args, [reqMock.body], 'repo.set should have been called with the correct data');
      assert.isTrue(resMock.json.calledOnce, 'res.json should have been called once');
      assert.deepEqual(resMock.json.firstCall.args, [mockRepo], 'res.json should have been called with the correct data');
      assert.isTrue(resMock.end.calledOnce, 'res.end should have been called once');
      assert.equal(reqMock.body.hookId, 0, 'req.body.hookId should have been set correctly');
    }));
  };
};