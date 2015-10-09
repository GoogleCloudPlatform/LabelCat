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
angular.module('labelcat').service('Repo', function ($http, Base) {

  var getReposForUserPromise;
  var getReposForOrgPromise;

  function Repo() {}

  Repo.prototype = new Base('repos');

  /**
   * Retrieve the public GitHub repos owned by the given user.
   *
   * @param {object} user - The user whose public GitHub repos are to be retrieved.
   */
  Repo.prototype.getReposForUser = function (user) {
    if (getReposForUserPromise) {
      return getReposForUserPromise;
    }
    return getReposForUserPromise = $http.get('/api/users/' + user.login + '/repos').then(function (response) {
      user.repos = response.data || [];
    }).finally(function () {
      getReposForUserPromise = null;
    });
  };

  Repo.prototype.search = function (name, owner) {
    return $http.get('/api/repos/search/' + owner + '/' + name).then(function (response) {
      return response.data;
    });
  };

  return new Repo(); 
});
