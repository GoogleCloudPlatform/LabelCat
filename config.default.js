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

module.exports = {
  port: '8080',
  host: '0.0.0.0',

  // Secret is used by cookie-session and csurf.
  // Set it to something more secure.
  secret: 'your-secret-here',

  // Configuration for the gcloud-node and googleapis libraries
  gcloud: {
    // This is the id of the project you created in Google Cloud.
    // e.g. https://console.developers.google.com/project/<projectId>
    projectId: 'project-id-here',
    // Path to the JSON key file you downloaded when you created the Service Account
    // credentials for your Google Cloud project.
    // See https://console.developers.google.com/project/<projectId>/apiui/credential
    keyFile: './key.json',
    // Datastore Namespace
    namespace: 'LabelCat'
  },

  // Configuration for GitHub authentication
  github: {
    // Whether LabelCat will request public or private (includes public) write access.
    accessLevel: 'public', // or "private"
    // Whether to limit LabelCat's write access to only those
    // repositories owned by the specified owner.
    // To enable restriction, set this to the name of a GitHub User or
    // Organization. The success of any writes still depends on the access
    // the logged in user has to any repo in question.
    ownerRestriction: null,
    // The Client ID of the application you registered on GitHub
    clientId: 'client-id-here',
    // The Client Secret of the application you registered on GitHub
    clientSecret: 'client-secret-here',
    // The callback url of the application you registered on GitHub
    redirectUrl: process.env.NODE_ENV === 'production' ? 'https://<your-project-id>.appspot.com/auth/github/callback' : 'http://localhost:8080/auth/github/callback',
    // A secret used to secure incoming webhooks coming from GitHub
    webhookSecret: 'your-secret-here'
  }
};