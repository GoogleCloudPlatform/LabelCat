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

let dependable = require('dependable');
let config = require('./config.js');
let path = require('path');
let gcloud = require('gcloud');
let GitHubApi = require('github');
let google = require('googleapis');

let key;
try {
  key = require(config.gcloud.keyFile);
} catch (err) {
  console.error(`Could not read key file! Did you download one from https://console.developers.google.com/project/${config.gcloud.projectId}/apiui/credential ?`);
  throw err;
}

let container = dependable.container();

container.register('Promise', function () {
  return require('bluebird');
});
container.register('request', function (Promise) {
  return Promise.promisify(require('request'));
});

container.register('config', config);

// Interface for communicating with the GCP DataStore.
container.register('dataset', function (Promise) {
  return Promise.promisifyAll(gcloud.datastore.dataset({
    projectId: config.gcloud.projectId,
    keyFilename: config.gcloud.keyFile
  }));
});

// Interface for communicating with the GCP PubSub.
container.register('pubsub', function (Promise) {
  return Promise.promisifyAll(gcloud.pubsub({
    projectId: config.gcloud.projectId,
    keyFilename: config.gcloud.keyFile
  }));
});

// Interface for communicating with the GCP Prediction API.
container.register('trainedModelsApi', function (Promise) {
  let trainedmodels = google.prediction('v1.6').trainedmodels;
  Promise.promisifyAll(trainedmodels);
  return trainedmodels;
});

// Interface for communicating with the GitHub API.
container.register('githubApi', function () {
  return new GitHubApi({
    version: '3.0.0',
    protocol: 'https',
    headers: {
      'User-Agent': 'LabelCat'
    }
  });
});

// Authorization tool for the Google APIs.
container.register('jwtClient', function (Promise) {
  return Promise.promisifyAll(new google.auth.JWT(
    key.client_email,
    null,
    key.private_key,
    ['https://www.googleapis.com/auth/prediction'],
    null
  ));
});

// Interface for communicating with the Predictions API.
container.register('prediction', function () {
  return google.prediction('v1.6');
})

// Register all of the files in these folders with the container, using each
// file's name as its registered name in the container.
container.load(path.join(`${__dirname}/app`, 'controllers'));
container.load(path.join(`${__dirname}/app`, 'lib'));
container.load(path.join(`${__dirname}/app`, 'middleware'));
container.load(path.join(`${__dirname}/app`, 'models'));

// Register the container with itself so it can be depended upon.
container.register('container', function () {
  return container;
});

module.exports = container;