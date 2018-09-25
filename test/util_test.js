const cli = require('../src/util.js');
const fs = require('fs');
const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;
const beforeEach = mocha.beforeEach;
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const assert = require('assert');

describe('makeCSV()', function() {
  it('should create a csv of issues', function() {
    const issues = [
      {
        repoName: 'a-repo',
        title: 'info',
        body: 'more info',
        labels: ['type: bug'],
      },
    ];

    const path = __dirname + '/' + 'testCSV.csv';
    cli.makeCSV(issues, path);

    let exists = true;
    try {
      fs.lstatSync(path).isFile();
    } catch (e) {
      if (e.code === 'ENOENT') {
        exists = false;
      }
    }

    assert(exists === true);

    // delete csv file that was created
    fs.unlink(path, err => {
      if (err) throw err;
    });
  });
});

describe('retrieveIssues', () => {
  let cli, axiosMock;

  beforeEach(() => {
    axiosMock = {get: sinon.stub()};
    cli = proxyquire('../src/util.js', {axios: axiosMock});
  });

  it('should pass new issue object to makeCSV', async () => {
    let issues = [
      {
        repository_url: 'http://',
        title: 'issue',
        body: 'details',
        labels: [{name: 'type: bug'}],
      },
    ];

    const path = __dirname + '/' + 'test.csv';
    const expectedResponse = Promise.resolve({data: issues});
    axiosMock.get.returns(expectedResponse);

    const result = await cli.retrieveIssues('test/test_repos.txt', path);

    // update issues to match updated labels value
    issues[0].labels = ['type: bug'];

    assert(result.length === 1);
    assert(result[0].body === 'details');
  });

  it('should throw an error', async () => {
    const path = __dirname + '/' + 'test.csv';

    const expectedResponse = Promise.resolve({
      response: {
        status: 404,
        statusText: 'Not Found',
      },
    });
    axiosMock.get.returns(expectedResponse);

    await cli.retrieveIssues('test/test_repos.txt', path);

    sinon.assert.calledOnce(axiosMock.get);
  });
});

describe('getIssueInfo()', function() {
  it('should return issue object', async function() {
    const originalIssue = {
      id: 1,
      node_id: 'MDU6SXNWUx',
      number: 1,
      repository_url: 'http://github.com/fakerepo',
      state: 'open',
      title: 'issue title',
      body: 'issue body',
      labels: [{name: 'type: bug'}],
    };

    const returnedIssue = {
      repository_url: 'http://github.com/fakerepo',
      title: 'issue title',
      body: 'issue body',
      labels: ['type: bug'],
    };

    const result = await cli.getIssueInfo(originalIssue);

    assert.strictEqual(
      Object.keys(result).length,
      Object.keys(returnedIssue).length
    );

    assert.strictEqual(Object.keys(result)[0], Object.keys(returnedIssue)[0]);
  });
  it('should throw an error', async () => {
    const badIssue = {
      repository_url: 'http://github.com/fakerepo',
      title: 'issue title',
      body: 'issue body',
    };

    let result = await cli.getIssueInfo(badIssue);
    assert(result === undefined);
  });
});
