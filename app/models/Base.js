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

module.exports = function (dataset, Promise) {
  
  class Base {
    constructor(props, kind) {
      this.props = props || {};
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
      return this.props[key];
    }

    /**
     * Set a property on this entity.
     *
     * @param {string} key - The name of the property to set.
     * @param {*} value - The value to set the property to.
     */
    set(key, value) {
      if (typeof key === 'string') {
        this.props[key] = value;
      } else if (typeof key === 'object') {
        for (var _key in key) {
          this.props[_key] = key[_key];
        }
      }
      return this;
    }

    /**
     * Return this entity's has of properties.
     */
    toJSON() {
      return this.props;
    }

    /**
     * Save this entity in its current state to the datastore.
     */
    save() {
      let key = this.get('id') ? dataset.key([this.kind, this.get('id')]) : dataset.key(this.kind);
      return dataset.saveAsync({
        key: key,
        data: this.props
      }).then(() => {
        if (!this.get('id')) {
          this.props.id = key.path[1];
          return this.save();
        } else {
          return this;
        }
      });
    }

    /******************
     * Static methods *
     *****************/

    /**
     * Remove a single entity from the datastore.
     *
     * @param {string} id - Id of the entity to retrieve.
     */
    static findOneById(id) {
      if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
        return Promise.reject(new Error('You must provide an id!'));
      } else {
        var Constructor = this;
        return dataset.getAsync(dataset.key([this.name, parseInt(id, 10)])).then(function (instance) {
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
      let query = dataset.createQuery(null, Constructor.name);
      if (params.modelId) {
        query = query.filter('modelId =', parseInt(params.modelId, 10));
      }
      if (params.userId) {
        query = query.filter('userId =', parseInt(params.userId, 10));
      }
      if (params.ownerId) {
        query = query.filter('ownerId =', parseInt(params.ownerId, 10));
      }
      if (params.githubId) {
        query = query.filter('githubId =', parseInt(params.githubId, 10));
      }
      query = query.limit(1000).start(0);

      return dataset.runQueryAsync(query).spread(function (entities) {
        return entities.map(function (entity) {
          entity.data.id = entity.key.path[1];
          return new Constructor(entity.data);
        });
      });
    }

    /**
     * Remove a collection of entities from the datastore by their IDs.
     *
     * @param {array} ids - Array of IDs.
     */
    static getAll(ids) {
      return Promise.all(ids.map(id => {
        return this.findOneById(id);
      }));
    }

    /**
     * Remove a single entity from the datastore.
     *
     * @param {string} id - The id of the entity to delete.
     */
    static destroyOneById(id) {
      if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
        return Promise.reject(new Error('You must provide an id!'));
      } else {
        return dataset.deleteAsync(dataset.key([this.name, id]));
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
          return dataset.key([this.name, entity.get('id')]);
        }))
      });
    }

    /**
     * Insert a new entity into the datastore.
     *
     * @param {object} props - Properties of the entity to be created.
     */
    static createOne(props) {
      props = props || {};
      let Constructor = this;
      let instance = new Constructor(props);
      return instance.save();
    }
  }

  return Base;
};