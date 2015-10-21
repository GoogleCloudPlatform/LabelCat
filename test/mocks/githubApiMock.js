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

module.exports = function (sinon, dataFaker) {
  return {
    create() {
      let userRepos = dataFaker.generateGitHubRepos('alice', 1234, '11-22-33-44', 'User')
                        .concat(dataFaker.generateGitHubRepos('GoogleCloudPlatform', 3333, '33-33-33-33', 'Organization'))
                        .concat(dataFaker.generateGitHubRepos('bar', 7777, '77-77-77-77', 'Organization'));

      return {
        userRepos,
        authenticate: sinon.stub(),
        repos: {
          getAll: sinon.stub().callsArgWithAsync(1, null, userRepos)
        }
      };
    }
  };
};