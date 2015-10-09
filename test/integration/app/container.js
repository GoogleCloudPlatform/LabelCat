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
// already been registered, like the GitHub API Client.
////////////////////////////////////////////////////////////////////////////////

// Register a way to re-create the Express app for every test
container.register('createServer', function () {
  return require('../../../app').createServer;
});

// Assertion library
container.register('assert', function () {
  let chai = require('chai');
  let chaiAsPromised = require('chai-as-promised');

  chai.use(chaiAsPromised);

  // Helper function for comparing objects
  chai.assert.objectsEqual = function (a, b, msg) {
    chai.assert.deepEqual(
      JSON.parse(JSON.stringify(a)),
      JSON.parse(JSON.stringify(b)),
      msg
    )
  };

  return chai.assert;
});

// Mocking & stubbing library
container.register('sinon', function () {
  return require('sinon');
});

// This allows us to hit and test our Express app with real HTTP requests
container.register('testRequest', function () {
  return require('supertest-as-promised');
});

// This allows us to simulate the Express cookie-session middleware,
// so we can have an authenticated user for certain requests
container.register('createSessionCookie', function (config) {
  let Keygrip = require('keygrip');
  let keys = new Keygrip([config.secret]);

  return function (session) {
    let str = JSON.stringify(session);
    let data = new Buffer(str).toString('base64');
    let sig = keys.sign(`express:sess=${data}`);
    return `express:sess=${data};express:sess.sig=${sig}`;
  };
});

// Load our mocks
container.load(path.join(__dirname, '../../mocks'));

// "bootstrap" is a function we'll run before every test to reset all of our
// test data and mocks
container.register('bootstrap', function (container, sinon, githubApiMock) {
  return function () {
    // Mock authenticated user data
    container.register('userSession', {
      passport: {
        user: {
          id: 1234,
          organizations_url: 'https://api.github.com/users/alice/orgs',
          avatar_url: 'https://avatars.githubusercontent.com/u/1234?v=3',
          login: 'alice',
          repos_url: 'https://api.github.com/users/alice/repos',
          access_token: 'alice_access_token'
        }
      }
    });

    // Mock GitHub API library
    container.register('githubApi', githubApiMock.create());
  };
});

module.exports = container;