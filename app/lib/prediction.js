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

module.exports = function (jwtClient, Promise, config, trainedModelsApi) {

  /**
   * Authorize and execute the specified Prediction API method.
   *
   * @private
   *
   * @param {string} method - The name of the Prediction API method to execute.
   * @param {object} params - Params to pass to the Prediction API.
   */
  function execute(method, params) {
    // TODO: Does this authorization need to be done on every call?
    return jwtClient.authorizeAsync().then(function () {
      params.auth = jwtClient;
      params.project = config.gcloud.projectId;
      return trainedModelsApi[`${method}Async`](params);
    });
  }

  /**
   * Group the given issues by their labels.
   *
   * @private
   *
   * @param {array} issues - The issues to group.
   */
  function groupByLabel(issues) {
    let groups = {};
    issues.forEach(function (issue) {
      issue.labels.forEach(function (label) {
        if (!groups.hasOwnProperty(label.name)) {
          groups[label.name] = [];
        }
        groups[label.name].push(issue);
      });
    });
    return groups;
  }

  /**
   * Prediction API interface.
   */
  return {

    /**
     * Return the analysis of the trained model with the given id.
     *
     * @param {number} id - The id of the model analysis to retrieve.
     */
    analyzeModelById(id) {
      return execute('analyze', {
        id
      });
    },

    /**
     * Return the trained model with the given id.
     *
     * @param {number} id - The id of the model to retrieve.
     */
    getModelById(id) {
      return execute('get', {
        id
      });
    },

    /**
     * Destroy model with the given id.
     *
     * @param {number} id - The id of the model to destroy.
     */
    destroyModelById(id) {
      return execute('delete', {
        id
      });
    },

    /**
     * Train the model with the given id and the provided examples.
     *
     * @param {number} id - The id of the model to train.
     * @param {array} examples - The examples with which to train the model.
     */
    trainModel(id, examples) {
      return execute('insert', {
        resource: {
          id,
          modelType: 'classification',
          trainingInstances: examples
        }
      });
    },

    /**
     * Predict a class for the given example using the model with the provided id.
     *
     * @param {number} id - The id of the model to train.
     * @param {obejct} example - The example for which to predict a class.
     */
    predict(id, example) {
      return execute('predict', {
        id,
        resource: {
          input: {
            csvInstance: example.csvInstance
          }
        }
      });
    },

    /**
     * Create a training example from the given issue.
     *
     * @param {object} issue - The issue from which to create the training example.
     */
    createExample(issue) {
      return {
        output: null,
        csvInstance: [
          issue.title,
          issue.title.indexOf('?') !== -1 ? 1 : 0,
          issue.user.login,
          issue.body,
          issue.comments
        ]
      }
    },

    /**
     * Create the positive and negative training exampels from the given issues.
     *
     * @param {object} model - The model for which the examples are to be created.
     * @param {array} issues - The issues from which to create the training examples.
     */
    createExamples(model, issues) {
      let label = model.get('label');
      let groups = groupByLabel(issues);
      if (!groups[model.get('label')]) {
        throw new Error('No issues found with model\'s label!');
      }
      let positiveExamples = groups[label].map(this.createExample);
      positiveExamples.forEach(function (example) {
        example.output = 1;
      });
      let negativeExamples = issues.filter(function (issue) {
        let hasLabel = false;
        issue.labels.forEach(function (_label) {
          if (_label.name === label) {
            hasLabel = true;
            return false;
          }
        });
        return !hasLabel && issue.labels.length;
      }).map(this.createExample);
      negativeExamples.forEach(function (example) {
        example.output = 0;
      });
      return positiveExamples.concat(negativeExamples);
    }
  };
};