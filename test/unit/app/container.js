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

process.env.NODE_ENV = 'test';

let path = require('path');

// Initialize the app's IOC container
let container = require('../../../container');

////////////////////////////////////////////////////////////////////////////////
// Since we're now in a test environment, we're going to add more libraries to
// our IOC container and then override and mock some of the things that have
// already been registered.
////////////////////////////////////////////////////////////////////////////////

// Assertion library
container.register('assert', function () {
  return require('chai').assert;
});

// Mocking & stubbing library
container.register('sinon', function () {
  return require('sinon');
});

// Load our mocks
container.load(path.join(__dirname, '../../mocks'));

// "bootstrap" is a function we'll run before every test to reset all of our
// test data and mocks
container.register('bootstrap', function (container, sinon, githubApiMock, datasetMock, trainedModelsApiMock, resMock) {
  return function () {
    // Mock GitHub API library
    container.register('githubApi', githubApiMock.create());

    // Mock DataStore
    container.register('dataset', datasetMock.create());

    // Mock Prediction API
    container.register('trainedModelsApi', trainedModelsApiMock.create());

    // Mock Express Response
    container.register('resMock', resMock.create());
  };
});

module.exports = container;