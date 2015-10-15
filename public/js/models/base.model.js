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
angular.module('labelcat').service('Base', function ($q, $http) {

  /**
   * An abstract "base" class from which our other Models inherit prototype methods.
   *
   * @param {string} pathname - The pathname to be used in the url of requests.
   */
  function Base(pathname) {
    this.pathname = pathname;
  }

  /**
   * Create a single entity on the server.
   *
   * @param {object=} props - Properties with which to initialize the new entity.
   */
  Base.prototype.createOne = function (props) {
    props = props || {};
    if (!props.id) {
      return $http.post('/api/' + this.pathname, props).then(function (response) {
        return response.data;
      });
    } else {
      return this.updateOneById(props.id, props);
    }
  };

  /**
   * Update an existing single entity on the server.
   *
   * @param {number} id - The id of the entity to update.
   * @param {object=} props - Properties with which to update the entity.
   */
  Base.prototype.updateOneById = function (id, props) {
    var _this = this;
    if (!id || typeof id !== 'string') {
      return this.createOne({}).then(function (entity) {
        return _this.updateOneById(entity.key, props);
      });
    } else {
      props = props || {};
      return $http.put('/api/' + this.pathname + '/' + id, props).then(function (response) {
        return response.data;
      });
    }
  };

  /**
   * Create a single entity on the server.
   *
   * @param {number} id - The id of the entity to retrieve.
   */
  Base.prototype.findOneById = function (id) {
    if (typeof id !== 'string' && typeof id !== 'number') {
      return $q.reject(new Error('You must provide an id!'));
    } else {
      return $http.get('/api/' + this.pathname + '/' + id).then(function (response) {
        return response.data;
      });
    }
  };

  /**
   * Retrieve a collection of entities from the server.
   *
   * @param {object=} params - Criteria for filtering the result set.
   */
  Base.prototype.findAll = function (params) {
    params = params || {};
    return $http.get('/api/' + this.pathname, {
      params: params
    }).then(function (response) {
      return response.data;
    });
  };

  /**
   * Destroy a single entity from the server.
   *
   * @param {number} id - The id of the entity to destroy.
   */
  Base.prototype.destroyOneById = function (id) {
    if (typeof id !== 'string' && typeof id !== 'number') {
      return $q.reject(new Error('You must provide an id!'));
    } else {
      return $http.delete('/api/' + this.pathname + '/' + id).then(function (response) {
        return response.data;
      });
    }
  };

  return Base; 
});