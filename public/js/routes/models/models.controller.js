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
angular.module('labelcat').controller('ModelsCtrl', function ($rootScope, $scope, $location, $window, $log, $route, Repo, Model, ToastService) {
  var Ctrl = this;
  var login = $route.current.params.login;
  var id = $route.current.params.id;
  var user = $route.current.locals.user;

  /** 
   * Select a particular model for viewing.
   *
   * @params {object} model - The model to select.
   */
  Ctrl.viewModel = function (model) {
    $rootScope.suppressModelsLoad = true;
    Ctrl.entity.models = Ctrl.models;
    $location.path('/' + login + '/models/' + model.id);
  };

  /**
   * Cancel editing the new model.
   */
  Ctrl.cancel = function (model) {
    Ctrl.model = null;
    Ctrl.models.splice(Ctrl.models.indexOf(model));
  };

  /**
   * Start editing a new model.
   */
  Ctrl.newModel = function () {
    $rootScope.suppressModelsLoad = true;
    Ctrl.entity.models = Ctrl.models;
    if (Ctrl.models.length && Ctrl.models[Ctrl.models.length - 1].id === 'new') {
      $location.path('/' + login + '/models/new');
    } else {
      Ctrl.models.push({ id: 'new' });
      Ctrl.model = Ctrl.models[Ctrl.models.length - 1];
      $location.path('/' + login + '/models/' + Ctrl.model.id);
    }
  };

  /**
   * Add a repo to the given model for analysis.
   *
   * @param {object} model - The model to which to add the repo.
   * @param {string} repoToAdd - The :owner/:repo string.
   */
  Ctrl.addRepo = function (model, repoToAdd) {
    if (!repoToAdd || repoToAdd.indexOf('/') === -1) {
      ToastService.error('You must specify an owner and repository name!');
      return;
    }

    Ctrl.processing = true;
    return Repo.search(
      repoToAdd.substring(repoToAdd.indexOf('/') + 1),
      repoToAdd.substring(0, repoToAdd.indexOf('/'))
    ).then(function (repo) { 
      if (repo) {
        if (!model.repos) {
          model.repos = [];
        }
        var existingRepos = model.repos.filter(function (_repo) {
          _repo.id == repo.id;
        });
        if (!existingRepos.length) {
          Ctrl.repoToAdd = '';
          model.repos.push(repo);
          return Model.updateOneById(model.id, {
            repos: model.repos
          }).then(function () {
            ToastService.success('Successfully added repo.');
          });
        } else {
          ToastService.error('Repo has already been added to model!');
        }
      } else {
        ToastService.error('Cannot access repo or repo does not exist!');
      }
    }).catch(function (err) {
      $log.error(err);
      ToastService.error('Failed to save model!');
    }).finally(function () {
      Ctrl.processing = false;
    });
  };

  /**
   * Save a model in its current state.
   *
   * @param {object} model - The model to save.
   */
  Ctrl.save = function (model) {
    if (!model.label) {
      ToastService.error('You must enter a label!');
      return;
    }
    Ctrl.processing = true;
    var payload = {
      name: model.name,
      label: model.label,
      ownerId: Ctrl.entity.id
    };
    var promise;
    if (model.id === 'new') {
      promise = Model.createOne(payload);
    } else {
      promise = Model.updateOneById(model.id, payload);
    }
    return promise.then(function (_model) {
      ToastService.success('Successfully saved model.');
      angular.extend(model, _model);
      if (model.id === 'new') {
        $location.path('/' + login + '/models/' + _model.id).replace;
      }
    }).catch(function (err) {
      $log.error(err);
      ToastService.error('Failed to save model!');
    }).finally(function () {
      Ctrl.processing = false;
    });
  };

  /**
   * Destroy the given model.
   *
   * @param {object} model - The model to destroy.
   */
  Ctrl.destroy = function (model) {
    if ($window.confirm('Are you sure you want to delete "' + model.name + '"?')) {
      Ctrl.loading = true;
      return Model.destroyOneById(model.id).then(function () {
        Ctrl.models.splice(Ctrl.models.indexOf(model), 1);
        Ctrl.model = null;
        ToastService.success('Successfully deleted model.');
      }).catch(function (err) {
        $log.error(err);
        ToastService.error('Failed to delete model!');
      }).finally(function () {
        Ctrl.loading = false;
      });
    }
  };

  /**
   * Train the given model.
   *
   * @param {object} model - The model to re-train.
   */
  Ctrl.train = function (model) {
    Ctrl.processing = true;
    return Model.train(model.id).then(function () {
      model.trainingStatus = 'QUEUED';
      ToastService.success('Successfully triggered training of model.');
    }).catch(function (err) {
      $log.error(err);
      ToastService.error('Failed to re-train model!');
    }).finally(function () {
      Ctrl.processing = false;
    });
  };

  /**
   * Remove the given repo from the current model.
   *
   * @param {object} repo - The repo to remove.
   */
  Ctrl.removeRepo = function (repo) {
    if (!Ctrl.model) {
      return;
    }
    Ctrl.model.repos = Ctrl.model.repos || [];
    Ctrl.processing = true;
    Ctrl.model.repos = Ctrl.model.repos.filter(function (_repo) {
      return repo.id != _repo.id;
    });

    Ctrl.processing = true;
    return Model.updateOneById(Ctrl.model.id, {
      repos: Ctrl.model.repos
    }).then(function () {
      ToastService.success('Successfully removed ' + repo.name);
    }).catch(function (err) {
      $log.error(err);
      ToastService.error('Failed to remove repo!');
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

  function loadModel() {
    // Check if also viewing individual model
    if (id) {
      Ctrl.models.forEach(function (model) {
        if (model.id == id) {
          Ctrl.model = model;
        }
      });
      if (id === 'new' && !Ctrl.model) {
        Ctrl.models.push({ id: 'new', name: 'new-model' });
        Ctrl.model = Ctrl.models[Ctrl.models.length - 1];
      }
      if (!Ctrl.model) {
        // Model not found
        $location.path('/404').replace();
      } else if (id !== 'new') {
        // Retrieve model details
        Ctrl.loadingModel = true;
        Model.findOneById(Ctrl.model.id).then(function (model) {
          angular.extend(Ctrl.model, model);
          var name = model.name;
          var label = model.label;
          $scope.$watch('Ctrl.model', function (_model) {
            Ctrl.hasChanges = _model.name !== name || _model.label !== label;
          }, true);
        }).catch(function () {
          ToastService.error('Failed to fetch updates for model!');
        }).finally(function () {
          Ctrl.loadingModel = false;
        });
      }
    }
  }

  if ($rootScope.suppressModelsLoad) {
    $rootScope.suppressModelsLoad = false;
    Ctrl.models = Ctrl.entity.models;
    loadModel();
  } else {
    $rootScope.loading = true;
    // Load models for entity
    Model.findAll({
      ownerId: Ctrl.entity.id
    }).then(function (models) {
      Ctrl.models = models;

      loadModel();
    }).catch(function () {
      ToastService.error('Failed to load models for ' + login + '!');
    }).finally(function () {
      $rootScope.loading = false;
    });
  }
});