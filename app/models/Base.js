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

module.exports = function (config, dataset, Promise) {
  
  class Base {
    constructor(key, data, kind) {
      this.key = key;
      this.data = data || {};
      this.kind = kind;
    }

    /********************
     * Instance methods *
     *******************/

    /**
     * Get a property of this entity.
     *
     * @param {string} key - The name of the property to retrieve.
     */
    get(key) {
      return this.data[key];
    }

    /**
     * Set a property on this entity.
     *
     * @param {string} key - The name of the property to set.
     * @param {*} value - The value to set the property to.
     */
    set(key, value) {
      if (typeof key === 'string') {
        this.data[key] = value;
      } else if (typeof key === 'object') {
        for (var _key in key) {
          this.data[_key] = key[_key];
        }
      }
      return this;
    }

    /**
     * Return this entity's has of properties.
     */
    toJSON() {
      return this.data;
    }

    /**
     * Save this entity in its current state to the datastore.
     */
    save() {
      return dataset.saveAsync({
        key: dataset.key({
          namespace: config.gcloud.namespace,
          path: [this.kind, this.key]
        }),
        data: this.data
      }).then(() => this);
    }

    /******************
     * Static methods *
     *****************/

    /**
     * Remove a single entity from the datastore.
     *
     * @param {string} key - The key of the entity to retrieve.
     */
    static findOne(key) {
      if (!key || typeof key !== 'string') {
        return Promise.reject(new Error('You must provide a key!'));
      } else {
        let Constructor = this;
        return dataset.getAsync(dataset.key({
          namespace: config.gcloud.namespace,
          path: [this.name, key]
        })).then(function (instance) {
          return instance ? new Constructor(instance.data) : null;
        });
      }
    }

    /**
     * Retrieve a collection of entities from the datastore.
     *
     * @param {object} params - Query params.
     */
    static findAll(params) {
      params = params || {};
      let Constructor = this;
      let query = dataset.createQuery(config.gcloud.namespace, Constructor.name);
      if (params.modelId) {
        query = query.filter('modelId =', parseInt(params.modelId, 10));
      }
      if (params.userKey) {
        query = query.filter('userKey =', parseInt(params.userKey, 10));
      }
      if (params.ownerLogin) {
        query = query.filter('ownerLogin =', params.ownerLogin);
      }
      if (params.full_name) {
        query = query.filter('full_name =', params.full_name);
      }
      query = query.limit(1000).start(0);

      return dataset.runQueryAsync(query).spread(function (entities) {
        return entities.map(function (entity) {
          return new Constructor(entity.data);
        });
      });
    }

    /**
     * Remove a collection of entities from the datastore by their keys.
     *
     * @param {array} keys - Array of keys.
     */
    static getAll(keys) {
      return Promise.all(keys.map(key => {
        return this.findOne(key);
      }));
    }

    /**
     * Remove a single entity from the datastore.
     *
     * @param {string} key - The key of the entity to delete.
     */
    static destroyOne(key) {
      if (!key || typeof key !== 'string') {
        return Promise.reject(new Error('You must provide a key!'));
      } else {
        return dataset.deleteAsync(dataset.key({
          namespace: config.gcloud.namespace,
          path: [this.name, key]
        }));
      }
    }

    /**
     * Remove a collection of entities from the datastore.
     *
     * @param {object} params - Query params.
     */
    static destroyAll(params) {
      return this.findAll(params).then(entities => {
        return dataset.deleteAsync(entities.map(entity => {
          return dataset.key({
            namespace: config.gcloud.namespace,
            path: [this.name, entity.key]
          });
        }))
      });
    }
  }

  return Base;
};