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

let uuid = require('node-uuid');

module.exports = function (Base, container, prediction, Promise, dataset, logger, github, config) {
  
  class Model extends Base {
    constructor(props) {
      props.key = props.key || uuid.v4();
      super(props.key, props, 'Model');
    }

    /******************
     * Static methods *
     *****************/

    /**
     * Remove a single model from the datastore and delete the corresponding
     * model from the Prediction API.
     *
     * @param {string} key - The key of the model to delete.
     */
    static destroyOne(key) {
      // Call the parent implementation first.
      return super.destroyOne(key).then(function (model) {
        // Now retrieve the model from the Prediction API.
        return prediction.destroyModelById(key).catch(function (err) {
          if (err.code === 404) {
            return err;
          } else {
            return Promise.reject(err);
          }
        });
      });
    }

    /**
     * Retrieve single model from the datastore and retrieve the corresponding
     * model from the Prediction API.
     *
     * @param {string} key - The key of the model to retrieve.
     */
    static findOne(key) {
      // Call the parent implementation first.
      return super.findOne(key).then(function (model) {
        // Now retrieve the model from the Prediction API.
        return prediction.getModelById(key).spread(function (predictionResults) {
          // Prediction API only overrides our stored status in certain cases.
          if (model.get('trainingStatus') !== 'QUEUED' || predictionResults.trainingStatus === 'RUNNING') {
            model.set('trainingStatus', predictionResults.trainingStatus);
          }
          if (model.get('trainingStatus') === 'DONE') {
            model.set(predictionResults.modelInfo || {});
            model.set('created', predictionResults.created);
            model.set('trainingComplete', predictionResults.trainingComplete);
          }
          return prediction.analyzeModelById(key);
        }).spread(function (analysisResults) {
          model.set(analysisResults.modelDescription);
          model.set('outputFeature', analysisResults.dataDescription.outputFeature.text);
          return model;
        }).catch(function (err) {
          if (err.code === 404 && err.message === 'No Model found. Model must first be trained.') {
            model.set('trainingStatus', model.get('trainingStatus') || 'NOT_STARTED');
            return model;
          } else {
            logger.error(err);
            return Promise.reject(err);
          }
        });
      });
    }

    /**
     * Train a model.
     *
     * @param {string} key - The key of the model to train.
     */
    static trainOne(key) {
      let User = container.get('User');

      // Get the model.
      return this.findOne(key).then(function (model) {
        // Check to make sure it's not already running.
        if (model && model.get('trainingStatus') !== 'RUNNING') {
          let user;
          // Get the user so we have an access_token.
          return User.findOne(model.get('userKey')).then(function (_user) {
            user = _user;
            // Make sure the model has some repos to analyze.
            if (model.get('repos') && model.get('repos').length) {
              return model.get('repos');
            } else {
              throw new Error('Model does not have any repos on which to train!');
            }
          }).then(function (repos) {
            // Get all of the issues for all of the repos to be analyzed.
            return Promise.all(repos.map(function (repo) {
              return github.getIssuesForRepo(user, repo, 1);
            }));
          }).then(function (results) {
            let issues = [];
            results.forEach(function (_issues) {
              issues = issues.concat(_issues);
            });
            // Finally, train the model in the Prediction API.
            return prediction.trainModel(model.get('key'), prediction.createExamples(model, issues));
          }).spread(function () {
            return prediction.getModelById(key);
          }).spread(function (predictionResults) {
            model.set('trainingStatus', predictionResults.trainingStatus);
            return model.save();
          }).catch(function (err) {
            logger.error(err);
            model.set('trainingStatus', 'ERROR');
            model.set('trainingStatusMsg', err ? err.message : 'ERROR');
            return model.save();
          });
        }
      });
    }
  }

  return Model;
};