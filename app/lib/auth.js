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

let GitHubStrategy = require('passport-github').Strategy;
let passport = require('passport');

module.exports = function (config, dataset, User, github) {

  passport.serializeUser(function (user, done) {
    done(null, user.toJSON());
  });

  passport.deserializeUser(function (user, done) {
    done(null, new User(user));
  });

  // Use the GitHubStrategy within Passport.
  // Strategies in Passport require a `verify` function, which accept
  // credentials (in this case, an accessToken, refreshToken, and GitHub
  // profile), and invoke a callback with a user object.
  passport.use(new GitHubStrategy({
    clientID: config.github.clientId,
    clientSecret: config.github.clientSecret,
    callbackURL: config.github.redirectUrl
  }, function (accessToken, refreshToken, profile, done) {
    let user = new User({
      id: profile._json.id,
      login: profile._json.login,
      avatar_url: profile._json.avatar_url,
      access_token: accessToken
    });
    if (typeof config.github.ownerRestriction === 'string') {
      return github.getOrgsForUser(user).then(function (orgs) {
        let allowed = config.github.ownerRestriction === user.get('login');
        orgs.forEach(function (org) {
          allowed = allowed || config.github.ownerRestriction === org.login;
        });
        if (!allowed) {
          return done(null, false);
        } else {
          return user.save().then(function (user) {
            done(null, user);
          });
        }
      }).catch(done);
    } else {
      return user.save().then(function (user) {
        done(null, user);
      }).catch(done);
    }
  }));

  // not really anything to export
  return passport;
};