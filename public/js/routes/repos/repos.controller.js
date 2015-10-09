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
angular.module('labelcat').controller('ReposCtrl', function ($log, $location, $timeout, $http, $route, $rootScope, Repo, Model, UserService, ToastService) {
  var Ctrl = this;
  var login = $route.current.params.login;
  var id = $route.current.params.id ? parseInt($route.current.params.id, 10) : null;
  var user = $route.current.locals.user;

  /**
   * Select a particular repo for viewing.
   *
   * @params {object} repo - The repo to select.
   */
  Ctrl.viewRepo = function (repo) {
    $location.path('/' + login + '/repos/' + repo.id);
  };

  /**
   * Cause the repo to begin notifying us of created issues.
   *
   * @params {object} repo - The repo to enable.
   */
  Ctrl.enableRepo = function (repo) {
    return Repo.updateOneById(repo.id, {
      enabled: !!repo.enabled
    }).then(function (_repo) {
      angular.extend(repo, _repo);
      ToastService.success('Successfully saved repo!');
    }).catch(function (err) {
      if (err.data === 'Repo missing or need access!') {
        ToastService.error('Repo does not exist or we don\'t have access to create a webhook! Check with your organization admin.');
        $timeout(function () {
          repo.enabled = false;
        });
      } else {
        $log.error(err);
      }
    });
  };

  /**
   * Add a model to this repo.
   *
   * @params {object} repo - The repo to enable.
   */
  Ctrl.addModel = function (repo, id) {
    return Model.findOneById(id).then(function (model) {
      if (!repo.modelIds) {
        repo.modelIds = [];
      }
      if (repo.modelIds.indexOf(id) === -1) {
        repo.modelIds.push(id);
        Ctrl.adding = true;
        return Repo.updateOneById(repo.id, {
          modelIds: repo.modelIds
        }).then(function () {
          Ctrl.modelId = '';
          repo.models = repo.models || [];
          repo.models.push(model);
          ToastService.success('Successfully activated model for repo!');
        }).catch(function (err) {
          $log.error(err);
          ToastService.error('Failed to activate model for repo!');
        }).finally(function () {
          Ctrl.adding = false;
        });
      } else {
        ToastService.error('Model already activated for repo!');
      }
    }).catch(function () {
      ToastService.error('Model does not exist!');
    });
  };

  /**
   * Remove the given model from the current repo.
   *
   * @param {object} model - The model to remove.
   */
  Ctrl.removeModel = function (model) {
    if (!Ctrl.repo) {
      return;
    }
    Ctrl.repo.modelIds = Ctrl.repo.modelIds || [];
    Ctrl.processing = true;
    Ctrl.repo.modelIds = Ctrl.repo.modelIds.filter(function (id) {
      return id != model.id;
    });
    return Repo.updateOneById(Ctrl.repo.id, {
      modelIds: Ctrl.repo.modelIds
    }).then(function () {
      if (Ctrl.repo && Ctrl.repo.models) {
        Ctrl.repo.models = Ctrl.repo.models.filter(function (_model) {
          return _model.id != model.id;
        });
      } 
      ToastService.success('Successfully removed ' + model.name);
    }).catch(function (err) {
      $log.error(err);
      ToastService.error('Failed to remove model!');
    }).finally(function () {
      Ctrl.processing = false;
    });
  };
  
  // Check if viewing user or organization
  if (user.login === login) {
    Ctrl.entity = user;
  } else if (user.orgs[login]) {
    Ctrl.entity = user.orgs[login];
  } else {
    Ctrl.entity = null;
    $location.path('/404').replace();
    return;
  }

  // Check if also viewing individual repo
  if (id) {
    Ctrl.entity.repos.forEach(function (repo) {
      if (repo.id === id) {
        Ctrl.repo = repo;
      }
    });
    if (!Ctrl.repo) {
      // Repo not found
      $location.path('/404').replace();
    } else {
      // Retrieve repo details
      Ctrl.loadingRepo = true;
      Repo.findOneById(Ctrl.repo.id).then(function (repo) {
        angular.extend(Ctrl.repo, repo);
      }).catch(function () {
        ToastService.error('Failed to fetch updates for repo!');
      }).finally(function () {
        Ctrl.loadingRepo = false;
      });
    }
  }
});