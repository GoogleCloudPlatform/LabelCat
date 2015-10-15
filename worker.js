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

// Express and http server
var express = require('express');
var http = require('http');

// IOC container
var container = require('./container');

// By exporting our Express app creation functionality we can more easily write
// tests.
exports.createServer = function () {

  // Pull an initial set of dependencies from our IOC container
  return container.resolve(function (logger, messages, errorHandler, Model) {
    var hasSubscription = false;
    var app = express();

    // Log every request
    app.use(logger.requestLogger);

    // Google Cloud status check endpoint
    app.get('/_ah/health', statusCheck);
    app.get('/', statusCheck);

    // Add the error logger after all middleware and routes so that
    // it can log errors from the whole application. Any custom error
    // handlers should go after this.
    app.use(logger.errorLogger);

    // Catch all handler, assumes error
    app.use(errorHandler);

    // Subscribe to Cloud Pub/Sub and recieve messages to process models.
    // The subscription will continue to listen for messages until the server
    // is killed.
    messages.subscribe('train', 'shared-worker-process')
      .then(function (subscription) {
        // Mark worker's status as "good"
        hasSubscription = true;

        // Begin listening for messages
        subscription.on('message', handleMessage);
        subscription.on('error', handleError);

        // Clean up
        process.on('exit', function () {
          subscription.removeListener('message', handleMessage);
          subscription.removeListener('error', handleError);
        });
      })
      .catch(function (err) {
        logger.error('Failed to subscribe to messages.', err);
      });

    /**
     * Respond to Google Cloud status check.
     */
    function statusCheck(req, res) {
      res.status(hasSubscription ? 200 : 500).end();
    }

    /**
     * Handle an incoming message from PubSub.
     *
     * @private
     *
     * @param {object} message - PubSub message. See https://googlecloudplatform.github.io/gcloud-node/#/docs/pubsub/topic?method=subscription
     */
    function handleMessage(message) {
      var modelKey = message.data;

      if (typeof modelKey !== 'string' && typeof modelKey !== 'number') {
        logger.warn('Unknown request', message.data);
        // Immediately ack the message
        message.ack(function (err) {
          if (err) {
            logger.error(err);
          }
        });
      } else {
        logger.info('Training model: ', modelKey);
        Model.trainOne(modelKey).catch(function (err) {
          logger.error('Failed to train model: ', modelKey);
          logger.error(err);
        }).finally(function () {
          logger.info('Acking model: ', modelKey);
          message.ack(function (err) {
            if (err) {
              logger.error(err);
            } else {
              logger.info('Acked model: ', modelKey);
            }
          });
        });
      }
    }

    /**
     * Handle a subscription error.
     *
     * @private
     *
     * @param {object} err - Error object.
     */
    function handleError(err) {
      logger.error('Subscription error.', err);
    }

    return app;
  });
};

// Only initialize http server if this file is actually being executed as the
// "main" entry point of the program. The other case is that this file is being
// pulled into one of our tests.
if (module === require.main) {
  var config = container.get('config');
  var app = exports.createServer();
  var server = http.createServer(app).listen(process.env.NODE_ENV === 'production' ? config.port : 8082, config.host, function () {
    console.log(`App listening at http://${server.address().address}:${server.address().port}`);
    console.log('Press Ctrl+C to quit.');
  });
}