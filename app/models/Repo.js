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

let uuid = require('node-uuid');

module.exports = function (Base) {
  
  class Repo extends Base {
    constructor(props) {
      props.key = props.key || uuid.v4();
      super(props.key, props, 'Repo');
    }

    /******************
     * Static methods *
     *****************/

    /**
     * Return a smaller browser-friendly representation of a repo.
     *
     * @param {object} repo - The repo to serialize.
     */
    static serializeRepo(repo) {
      if (typeof repo.toJSON === 'function') {
        return repo.toJSON();
      } else if (repo.data && repo.key) {
        repo = repo.data;
      }
      return {
        key: repo.key,
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        enabled: !!repo.enabled,
        modelKeys: repo.modelKeys || [],
        models: repo.models || [],
        permissions: repo.permissions,
        userKey: repo.userKey,
        userLogin: repo.userLogin,
        owner: {
          login: repo.owner.login,
          id: repo.owner.id,
          avatar_url: repo.owner.avatar_url,
          type: repo.owner.type
        }
      };
    }
  }

  return Repo;
};