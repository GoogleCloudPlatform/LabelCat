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

  // Here is our entire integration test suite
  describe('Web API', function () {
    describe('User Controller', function () {
      describe('user.user', test('user', 'user'));
      describe('user.repos', test('user', 'repos'));
    });
    describe('Repos Controller', function () {
      describe('repos.findOne', test('repos', 'findOne'));
      describe('repos.findAll', test('repos', 'findAll'));
    });
  });
});