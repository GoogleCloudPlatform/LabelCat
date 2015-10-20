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

module.exports = function (container, assert, testRequest, Promise, createSessionCookie, dataFaker, sinon, config) {
  return function () {
    let app, Repo, userSession, dataset, trainedModelsApi, fakeRepoKey, fakeRepo;

    beforeEach(function () {
      app = container.get('app');
      Repo = container.get('Repo');
      userSession = container.get('userSession');
      dataset = container.get('dataset');
      trainedModelsApi = container.get('trainedModelsApi');
      fakeRepoKey = '12-34-56-78';
      let repos = dataFaker.generateGitHubRepos('alice', 1234, '11-22-33-44', 'User', 1);
      repos[0].key = fakeRepoKey;
      fakeRepo = repos[0];
    });

    it('Should return 401 if no authenticated user', Promise.coroutine(function* () {
      let response = yield testRequest(app)
                            .get('/api/repos')
                            .expect(401);

      assert.deepEqual(response.body, {}, 'Response body should be empty');
    }));

    it('Should return 500 on thrown errors', Promise.coroutine(function* () {
      dataset.createQuery.throws(new Error('foo'));

      let response = yield testRequest(app)
                            .get('/api/repos')
                            .set('Cookie', createSessionCookie(userSession))
                            .expect(500);

      assert.deepEqual(response.text, 'foo', 'Response text should be the error message');
    }));

    it('Should return 200 and an empty array if there are no repos to be found', Promise.coroutine(function* () {
      dataset.createQuery.returns({
        filter: sinon.stub().returnsThis(),
        limit: sinon.stub().returnsThis(),
        start: sinon.stub().returnsThis()
      });
      dataset.runQueryAsync.returns(Promise.resolve([[]]));

      let response = yield testRequest(app)
                            .get(`/api/repos`)
                            .set('Cookie', createSessionCookie(userSession))
                            .use(testRequest.fixJson)
                            .expect(200);

      assert.deepEqual(
        response.body,
        [],
        'Response body should be an empty array'
      );
      assert.isTrue(dataset.createQuery.calledOnce, 'dataset.createQuery should have been called once');
      assert.deepEqual(dataset.createQuery.firstCall.args, [config.gcloud.namespace, 'Repo'], 'dataset.createQuery should have been called with the correct arguments');
    }));

    it('Should return 200 and the repo', Promise.coroutine(function* () {
      let stubs = {
        filter: sinon.stub().returnsThis(),
        limit: sinon.stub().returnsThis(),
        start: sinon.stub().returnsThis()
      };
      dataset.createQuery.returns(stubs);
      dataset.runQueryAsync.returns(Promise.resolve([[{ data: fakeRepo }]]));
      
      let response = yield testRequest(app)
                            .get('/api/repos')
                            .query({ userKey: fakeRepo.userKey })
                            .set('Cookie', createSessionCookie(userSession))
                            .use(testRequest.fixJson)
                            .expect(200);

      assert.deepEqual(
        response.body,
        [fakeRepo],
        'Response body should be the repos'
      );
      assert.isTrue(dataset.createQuery.calledOnce, 'dataset.createQuery should have been called once');
      assert.deepEqual(dataset.createQuery.firstCall.args, [config.gcloud.namespace, 'Repo'], 'dataset.createQuery should have been called with the correct arguments');
      assert.isTrue(stubs.filter.calledOnce, 'query.filter should have been called once');
      assert.isTrue(stubs.limit.calledOnce, 'query.limit should have been called once');
      assert.isTrue(stubs.start.calledOnce, 'query.start should have been called once');
    }));

    it('Should return 200 and the repo and the models of the repo', Promise.coroutine(function* () {
      let fakeModel = {
        key: '24-24-24-24',
        outputFeature: 'foo',
        trainingStatus: 'RUNNING'
      };
      fakeRepo.modelKeys = [fakeModel.key];
      let stubs = {
        filter: sinon.stub().returnsThis(),
        limit: sinon.stub().returnsThis(),
        start: sinon.stub().returnsThis()
      };
      dataset.createQuery.returns(stubs);
      dataset.runQueryAsync.returns(Promise.resolve([[{ data: fakeRepo }]]));
      dataset.getAsync.onFirstCall().returns(Promise.resolve({
        data: {
          key: fakeModel.key
        }
      }));
      trainedModelsApi.getAsync.returns([Promise.resolve({ trainingStatus: 'RUNNING' })]);
      trainedModelsApi.analyzeAsync.returns([Promise.resolve({ dataDescription: { outputFeature: { text: 'foo' } } })]);
      
      let response = yield testRequest(app)
                            .get('/api/repos')
                            .query({ userKey: fakeRepo.userKey })
                            .set('Cookie', createSessionCookie(userSession))
                            .use(testRequest.fixJson)
                            .expect(200);

      fakeRepo.models = [fakeModel];
      assert.deepEqual(
        response.body,
        [fakeRepo],
        'Response body should be the repo'
      );
      assert.isTrue(dataset.createQuery.calledOnce, 'dataset.createQuery should have been called once');
      assert.deepEqual(dataset.createQuery.firstCall.args, [config.gcloud.namespace, 'Repo'], 'dataset.createQuery should have been called with the correct arguments');
      assert.isTrue(stubs.filter.calledOnce, 'query.filter should have been called once');
      assert.isTrue(stubs.limit.calledOnce, 'query.limit should have been called once');
      assert.isTrue(stubs.start.calledOnce, 'query.start should have been called once');
      assert.isTrue(dataset.getAsync.calledOnce, 'dataset.getAsync should have been called once');
      assert.deepEqual(dataset.getAsync.firstCall.args[0], {
        namespace: 'LabelCat',
        path: ['Model', fakeModel.key]
      }, 'dataset.getAsync should have been called with the correct key');
      assert.isTrue(container.get('jwtClient').authorizeAsync.calledTwice, 'jwtClient.authorizeAsync should have been called twice');
    }));
  };
};