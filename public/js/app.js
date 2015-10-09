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
angular.module('labelcat', [
  'ngMaterial',
  'ngRoute'
])
.config(function ($routeProvider, $locationProvider, $mdThemingProvider) {
  $locationProvider.html5Mode(true).hashPrefix('!');

  $routeProvider
    .when('/404', {
      templateUrl: '/js/partials/404.html'
    })
    .when('/500', {
      templateUrl: '/js/partials/500.html'
    })
    .otherwise({
      redirectTo: '404'
    });

    $mdThemingProvider.definePalette('docs-blue', $mdThemingProvider.extendPalette('blue', {
      '50':   '#DCEFFF',
      '100':  '#AAD1F9',
      '200':  '#7BB8F5',
      '300':  '#4C9EF1',
      '400':  '#1C85ED',
      '500':  '#106CC8',
      '600':  '#0159A2',
      '700':  '#025EE9',
      '800':  '#014AB6',
      '900':  '#013583',
      'contrastDefaultColor': 'light',
      'contrastDarkColors': '50 100 200 A100',
      'contrastStrongLightColors': '300 400 A200 A400'
    }));
    $mdThemingProvider.definePalette('docs-red', $mdThemingProvider.extendPalette('red', {
      'A100': '#DE3641'
    }));

    $mdThemingProvider.theme('docs-dark', 'default')
      .primaryPalette('yellow')
      .dark();

    $mdThemingProvider.theme('default')
        .primaryPalette('docs-blue')
        .accentPalette('docs-red');
})
.run(function ($rootScope, $http, $log, $location, $timeout, UserService) {
  $rootScope.login = function () {
    window.location = '/auth/github';
  };

  $rootScope.view = function (entity, path) {
    $rootScope.selectedEntity = entity;
    var path = path || $location.path();
    if (path.indexOf('models') !== -1) {
      $location.path('/' + entity.login + '/models');  
    } else {
      $location.path('/' + entity.login + '/repos');  
    }
  };

  $rootScope.$on('$routeChangeStart', function () {
    $rootScope.loading = true;
  });

  $rootScope.$on('$routeChangeSuccess', function () {
    var parts = $location.path().split('/');
    if (parts.length) {
      if (!parts[0]) {
        parts.shift();
      }
    }
    $rootScope.partOne = parts.length >= 1 ? parts[0] : '';
    $rootScope.partTwo = parts.length >= 2 ? parts[1] : '';
    $rootScope.partThree = parts.length >= 3 ? parts[2] : '';
    $rootScope.loading = false;
  });

  $rootScope.$on('$routeChangeError', function () {
    $rootScope.loading = false;
  });

  // Make sure we try and load any logged-in user when the app starts
  $rootScope.loading = true;
  UserService.user().finally(function () {
    $rootScope.loading = false;
  });

  if (localStorage.getItem('login_redirect')) {
    $location.url(localStorage.getItem('login_redirect')).replace();
  }
});
