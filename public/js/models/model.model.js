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
angular.module('labelcat').service('Model', function (Base, $q, $http) {

  function Model() {}

  Model.prototype = new Base('models');

  Model.prototype.train = function (id) {
    if (typeof id !== 'string' && typeof id !== 'number') {
      return $q.reject(new Error('You must provide an id!'));
    } else {
      return $http.post('/api/' + this.pathname + '/' + id + '/train').then(function (response) {
        return response.data;
      });
    }
  };

  return new Model(); 
});