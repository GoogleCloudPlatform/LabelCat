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

let faker = require('faker/locale/en_US');
let prefix = 'https://api.github.com';

function generateGitHubRepos(owner, id, key, type, count) {
  let num = typeof count === 'number' ? count : Math.ceil(Math.random() * 10);
  let repos = [];

  for (var i = 0; i < num; i++) {
    let name = faker.lorem.words().join('');
    repos.push({
      id: Math.ceil(Math.random() * 100000),
      key: '' + (Math.ceil(Math.random() * 100000)) + '-' + (Math.ceil(Math.random() * 100000)),
      name,
      full_name: `${owner}/${name}`,
      userLogin: owner,
      userKey: key,
      owner: {
        login: owner,
        id,
        avatar_url: `https://avatars.githubusercontent.com/u/${id}?v=3`,
        gravatar_id: '',
        url: `${prefix}/users/${owner}`,
        html_url: `https://github.com/${owner}`,
        followers_url: `${prefix}/users/${owner}/followers`,
        following_url: `${prefix}/users/${owner}/following{/other_user}`,
        gists_url: `${prefix}/users/${owner}/gists{/gist_id}`,
        starred_url: `${prefix}/users/${owner}/starred{/owner}{/repo}`,
        subscriptions_url: `${prefix}/users/${owner}/subscriptions`,
        organizations_url: `${prefix}/users/${owner}/orgs`,
        repos_url: `${prefix}/users/${owner}/repos`,
        events_url: `${prefix}/users/${owner}/events{/privacy}`,
        received_events_url: `${prefix}/users/${owner}/received_events`,
        type: type || 'User',
        site_admin: false
      },
      private: false,
      html_url: `https://github.com/${owner}/${name}`,
      description: `${name} is a simple and beautiful cross-platform application allowing users to do awesome things.`,
      fork: false,
      url: `${prefix}/repos/${owner}/${name}`,
      forks_url: `${prefix}/repos/${owner}/${name}/forks`,
      keys_url: `${prefix}/repos/${owner}/${name}/keys{/key_id}`,
      collaborators_url: `${prefix}/repos/${owner}/${name}/collaborators{/collaborator}`,
      teams_url: `${prefix}/repos/${owner}/${name}/teams`,
      hooks_url: `${prefix}/repos/${owner}/${name}/hooks`,
      issue_events_url: `${prefix}/repos/${owner}/${name}/issues/events{/number}`,
      events_url: `${prefix}/repos/${owner}/${name}/events`,
      assignees_url: `${prefix}/repos/${owner}/${name}/assignees{/user}`,
      branches_url: `${prefix}/repos/${owner}/${name}/branches{/branch}`,
      tags_url: `${prefix}/repos/${owner}/${name}/tags`,
      blobs_url: `${prefix}/repos/${owner}/${name}/git/blobs{/sha}`,
      git_tags_url: `${prefix}/repos/${owner}/${name}/git/tags{/sha}`,
      git_refs_url: `${prefix}/repos/${owner}/${name}/git/refs{/sha}`,
      trees_url: `${prefix}/repos/${owner}/${name}/git/trees{/sha}`,
      statuses_url: `${prefix}/repos/${owner}/${name}/statuses/{sha}`,
      languages_url: `${prefix}/repos/${owner}/${name}/languages`,
      stargazers_url: `${prefix}/repos/${owner}/${name}/stargazers`,
      contributors_url: `${prefix}/repos/${owner}/${name}/contributors`,
      subscribers_url: `${prefix}/repos/${owner}/${name}/subscribers`,
      subscription_url: `${prefix}/repos/${owner}/${name}/subscription`,
      commits_url: `${prefix}/repos/${owner}/${name}/commits{/sha}`,
      git_commits_url: `${prefix}/repos/${owner}/${name}/git/commits{/sha}`,
      comments_url: `${prefix}/repos/${owner}/${name}/comments{/number}`,
      issue_comment_url: `${prefix}/repos/${owner}/${name}/issues/comments{/number}`,
      contents_url: `${prefix}/repos/${owner}/${name}/contents/{+path}`,
      compare_url: `${prefix}/repos/${owner}/${name}/compare/{base}...{head}`,
      merges_url: `${prefix}/repos/${owner}/${name}/merges`,
      archive_url: `${prefix}/repos/${owner}/${name}/{archive_format}{/ref}`,
      downloads_url: `${prefix}/repos/${owner}/${name}/downloads`,
      issues_url: `${prefix}/repos/${owner}/${name}/issues{/number}`,
      pulls_url: `${prefix}/repos/${owner}/${name}/pulls{/number}`,
      milestones_url: `${prefix}/repos/${owner}/${name}/milestones{/number}`,
      notifications_url: `${prefix}/repos/${owner}/${name}/notifications{?since,all,participating}`,
      labels_url: `${prefix}/repos/${owner}/${name}/labels{/name}`,
      releases_url: `${prefix}/repos/${owner}/${name}/releases{/id}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pushed_at: new Date().toISOString(),
      git_url: `git://github.com/${owner}/${name}.git`,
      ssh_url: `git@github.com:${owner}/${name}.git`,
      clone_url: `https://github.com/${owner}/${name}.git`,
      svn_url: `https://github.com/${owner}/${name}`,
      homepage: '',
      size: Math.ceil(Math.random() * 1000),
      stargazers_count: Math.ceil(Math.random() * 10),
      watchers_count: Math.ceil(Math.random() * 10),
      language: faker.commerce.color(),
      has_issues: faker.random.boolean(),
      has_downloads: faker.random.boolean(),
      has_wiki: faker.random.boolean(),
      has_pages: faker.random.boolean(),
      forks_count: Math.ceil(Math.random() * 10),
      mirror_url: null,
      open_issues_count: Math.ceil(Math.random() * 100),
      forks: Math.ceil(Math.random() * 10),
      open_issues: Math.ceil(Math.random() * 100),
      watchers: Math.ceil(Math.random() * 10),
      default_branch: 'master',
      permissions: { admin: true, push: true, pull: true }
    });
  }

  return repos;
}

module.exports = function () {
  return {
    generateGitHubRepos
  };
};