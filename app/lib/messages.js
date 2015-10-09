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

// So as to create different topics and subscriptions in different environments.
const prefix = `${process.env.NODE_ENV ? process.env.NODE_ENV : 'local'}-`;

module.exports = function (pubsub, Promise) {

  /**
   * This configuration will automatically create the topic if
   * it doesn't yet exist. Usually, you'll want to make sure
   * that a least one subscription exists on the topic before
   * publishing anything to it as topics without subscribers
   * will essentially drop any messages.
   */
  function getTopic(resource) {
    return pubsub.createTopicAsync(resource).catch(function (err) {
      // topic already exists.
      if (err && err.code == 409) {
        return pubsub.topic(resource);
      } else {
        return Promise.reject(err);
      }
    });
  }

  /**
   * PubSub API interface.
   */
  return {
    /**
     * Subscribe to a topic.
     *
     * @param {string} topicName - The name of the topic to subscribe to.
     * @param {string} subscriptionName - The name of the new subscription.
     */
    subscribe(topicName, subscriptionName) {
      return getTopic(`${prefix}${topicName}`).then(function () {
        return pubsub.subscribeAsync(
          `${prefix}${topicName}`,
          `${prefix}${subscriptionName}`, {
            autoAck: false,
            maxInProgress: 1,
            reuseExisting: true
          }
        ).get(0);
      });
    },

    /**
     * Send a message.
     *
     * @param {string} topicName - The name of the topic on which to publish.
     * @param {string} message - The message to publish.
     */
    sendMessage(topicName, message) {
      return getTopic(`${prefix}${topicName}`).then(function (topic) {
        return new Promise(function (resolve, reject) {
          topic.publish({
            data: message
          }, function (err) {
            if (err) {
              return reject(err);
            } else {
              return resolve();
            }
          })
        });
      });
    }
  };
};