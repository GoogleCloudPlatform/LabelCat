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
angular.module('labelcat').service('UserService', function ($rootScope, $http) {

  var userPromise;
  var reposPromise;

  function getUserRepos(user) {
    if (!reposPromise) {
      reposPromise = $http.get('/api/user/repos').then(function (response) {
        var repos = response.data;

        user.orgs = {};
        user.repos = [];

        repos.forEach(function (repo) {
          if (repo.owner.login === user.login) {
            user.repos.push(repo);
            repo.owner = user;
          } else {
            if (!user.orgs.hasOwnProperty(repo.owner.login)) {
              user.orgs[repo.owner.login] = repo.owner;
              repo.owner.repos = [];
            }
            user.orgs[repo.owner.login].repos.push(repo);
            repo.owner = user.orgs[repo.owner.login];
          }
        });
        return user;
      });
    }

    return reposPromise;
  }

  return {
    user: function () {
      if (!userPromise) {
        $rootScope.loading = true;
        userPromise = $http.get('/api/user').then(function (response) {
          $rootScope.user = response.data;
          return getUserRepos($rootScope.user);
        }).finally(function () {
          $rootScope.loading = false;
        });
      }

      return userPromise;
    }
  };
});