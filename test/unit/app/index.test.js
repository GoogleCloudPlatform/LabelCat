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

describe('Unit Tests', function () {
  let container = require('./container');
  let assert = container.get('assert');
  let Promise = container.get('Promise');

  beforeEach(function () {
    // Reset mocks and test data
    container.get('bootstrap')();
  });

  /**
   * Helper function that loads a test file, injects the dependencies it calls
   * for and finally registers the exported callback with the Mocha "describe"
   * clause.
   *
   * @private
   *
   * @param {string} controller - Name of the controller the test belongs to.
   * @param {method} method - Name of the method that's being tested.
   */
  function test(controller, method) {
    return container.resolve(require('./controllers/' + controller + '/' + method + '.test'));
  }

  describe('controllers/', function () {
    describe('user.js', function () {
      describe('user()', test('user', 'user'));
      describe('repos()', test('user', 'repos'));
    });
    describe('repos.js', function () {
      describe('findOne()', test('repos', 'findOne'));
      describe('findAll()', test('repos', 'findAll'));
      describe('search()', test('repos', 'search'));
      describe('updateOne()', test('repos', 'updateOne'));
    });
  });

  describe('lib/', function () {
    describe('github.js', function () {
      describe('findRepoById()', () => it('write me please'));
      describe('searchForRepo()', () => it('write me please'));
      describe('getReposForUser()', () => it('write me please'));
      describe('getIssuesForRepo()', () => it('write me please'));
      describe('findOrCreateHook()', () => it('write me please'));
      describe('deleteHook()', () => it('write me please'));
      describe('addLabelsToIssue()', () => it('write me please'));
    });
    describe('messages.js', function () {
      describe('subscribe()', () => it('write me please'));
      describe('sendMessage()', () => it('write me please'));
    });
    describe('prediction.js', function () {
      describe('analyzeModelById()', () => it('write me please'));
      describe('getModelById()', () => it('write me please'));
      describe('destroyModelById()', () => it('write me please'));
      describe('trainModel()', () => it('write me please'));
      describe('predict()', () => it('write me please'));
      describe('createExample()', () => it('write me please'));
      describe('createExamples()', () => it('write me please'));
    });
    describe('utils.js', function () {
      describe('makeSafe()', () => it('write me please'));
    });
  });

  describe('middleware/', function () {
    describe('ensureAuthenticated.js', () => it('write me please'));
    describe('errorHandler.js', () => it('write me please'));
    describe('jsonpSecurity.js', () => it('write me please'));
  });

  describe('models/', function () {
    describe('Base.js', function () {
      describe('#get()', () => it('write me please'));
      describe('#set()', () => it('write me please'));
      describe('#toJSON()', () => it('write me please'));
      describe('#save()', () => it('write me please'));
      describe('findOne()', () => it('write me please'));
      describe('findAll()', () => it('write me please'));
      describe('findAll()', () => it('write me please'));
      describe('getAll()', () => it('write me please'));
      describe('destroyOne()', () => it('write me please'));
      describe('destroyAll()', () => it('write me please'));
    });
    describe('Model.js', function () {
      describe('findOne()', () => it('write me please'));
      describe('destroyOne()', () => it('write me please'));
      describe('trainOne()', () => it('write me please'));
    });
    describe('Repo.js', function () {
      describe('serializeRepo()', () => it('write me please'));
    });
    describe('User.js', function () {
      describe('safeToJSON()', () => it('write me please'));
    });
  });

});