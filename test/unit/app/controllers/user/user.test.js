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

module.exports = function (container, assert, sinon) {
  return function () {
    let user, resMock;

    beforeEach(function () {
      user = container.get('user');
      resMock = container.get('resMock');
    });

    it('should check for an authenticated user and return it', function () {
      let req = {
        isAuthenticated() {
          return true;
        },
        user: {
          safeToJSON: sinon.stub().returns({ key: '1' })
        }
      };
      user.user(req, resMock);

      assert.isTrue(resMock.status.calledOnce, 'res.status should have been called once');
      assert.isTrue(resMock.status.calledWith(200), 'res.status should have been set to 200');
      assert.isTrue(req.user.safeToJSON.calledOnce, 'req.user.safeToJSON should have been called once');
      assert.isTrue(resMock.json.calledOnce, 'res.json should have been called once');
      assert.deepEqual(resMock.json.firstCall.args[0], { key: '1' }, 'res.json should have been called with correct data');
      assert.isTrue(resMock.end.calledOnce, 'res.end should have been called once');
    });

    it('should return 200 and empty body if there is no authenticated user', function () {
      let req = {
        isAuthenticated() {
          return false;
        }
      };
      user.user(req, resMock);

      assert.isTrue(resMock.status.calledOnce, 'res.status should have been called once');
      assert.isTrue(resMock.status.calledWith(200), 'res.status should have been set to 200');
      assert.isTrue(resMock.end.calledOnce, 'res.end should have been called once');
    });
  };
};