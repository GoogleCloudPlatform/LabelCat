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

module.exports = function (container, assert, testRequest, Promise, createSessionCookie, dataFaker) {
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
                            .get('/api/repos/22-33-44')
                            .expect(401);

      assert.deepEqual(response.body, {}, 'Response body should be empty');
    }));

    it('Should return 500 on thrown errors', Promise.coroutine(function* () {
      dataset.getAsync.throws(new Error('foo'));

      let response = yield testRequest(app)
                            .get('/api/repos/22-33-44')
                            .set('Cookie', createSessionCookie(userSession))
                            .expect(500);

      assert.deepEqual(response.text, 'foo', 'Response text should be the error message');
    }));

    it('Should return 200 and an empty body if the repo is not in the datastore', Promise.coroutine(function* () {
      // Act as is the repo is not in the datastore
      dataset.getAsync.returns(Promise.resolve());

      let response = yield testRequest(app)
                            .get(`/api/repos/${fakeRepoKey}`)
                            .set('Cookie', createSessionCookie(userSession))
                            .use(testRequest.fixJson)
                            .expect(200);

      assert.equal(
        response.body,
        '',
        'Response body should be empty'
      );
      assert.isTrue(dataset.getAsync.calledOnce, 'dataset.getAsync should have been called once');
      assert.deepEqual(dataset.getAsync.firstCall.args[0], {
        namespace: 'LabelCat',
        path: ['Repo', fakeRepoKey]
      }, 'dataset.getAsync should have been called with the correct key');
    }));

    it('Should return 200 and the repo', Promise.coroutine(function* () {
      dataset.getAsync.returns(Promise.resolve({ data: fakeRepo }));
      
      let response = yield testRequest(app)
                            .get(`/api/repos/${fakeRepoKey}`)
                            .set('Cookie', createSessionCookie(userSession))
                            .use(testRequest.fixJson)
                            .expect(200);

      assert.deepEqual(
        response.body,
        fakeRepo,
        'Response body should be the repo'
      );
      assert.isTrue(dataset.getAsync.calledOnce, 'dataset.getAsync should have been called once');
      assert.deepEqual(dataset.getAsync.firstCall.args[0], {
        namespace: 'LabelCat',
        path: ['Repo', fakeRepoKey]
      }, 'dataset.getAsync should have been called with the correct key');
    }));

    it('Should return 200 and the repo and the repo\s models', Promise.coroutine(function* () {
      let fakeModel = {
        key: '24-24-24-24',
        outputFeature: 'foo',
        trainingStatus: 'RUNNING'
      };
      fakeRepo.modelKeys = [fakeModel.key];
      dataset.getAsync.onFirstCall().returns(Promise.resolve({ data: fakeRepo }));
      dataset.getAsync.onSecondCall().returns(Promise.resolve({
        data: {
          key: fakeModel.key
        }
      }));
      trainedModelsApi.getAsync.returns([Promise.resolve({ trainingStatus: 'RUNNING' })]);
      trainedModelsApi.analyzeAsync.returns([Promise.resolve({ dataDescription: { outputFeature: { text: 'foo' } } })]);
      
      let response = yield testRequest(app)
                            .get(`/api/repos/${fakeRepoKey}`)
                            .set('Cookie', createSessionCookie(userSession))
                            .use(testRequest.fixJson)
                            .expect(200);

      fakeRepo.models = [fakeModel];
      assert.deepEqual(
        response.body,
        fakeRepo,
        'Response body should be the repo'
      );
      assert.isTrue(dataset.getAsync.calledTwice, 'dataset.getAsync should have been called twice');
      assert.deepEqual(dataset.getAsync.firstCall.args[0], {
        namespace: 'LabelCat',
        path: ['Repo', fakeRepoKey]
      }, 'dataset.getAsync should have been called with the correct key');
      assert.deepEqual(dataset.getAsync.secondCall.args[0], {
        namespace: 'LabelCat',
        path: ['Model', fakeModel.key]
      }, 'dataset.getAsync should have been called with the correct key');
    }));
  };
};