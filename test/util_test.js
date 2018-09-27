const util = require('../src/util.js');
const settings = require('../settings.json');
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
    util.makeCSV(issues, path);

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
  let util, axiosMock;

  beforeEach(() => {
    axiosMock = {get: sinon.stub()};
    util = proxyquire('../src/util.js', {axios: axiosMock});
  });

  it('should pass new issue object to makeCSV', async () => {
    let issues = [
      {
        title: 'issue',
        body: 'details',
        labels: [{name: 'type: bug'}],
      },
    ];

    const path = __dirname + '/' + 'test.csv';
    const expectedResponse = Promise.resolve({data: issues});
    axiosMock.get.returns(expectedResponse);

    const result = await util.retrieveIssues('test/test_repos.txt', path);

    // update issues to match updated labels value
    issues[0].labels = ['type: bug'];

    assert(result.length === 1);
    assert(result[0].text === 'issue details');
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

    await util.retrieveIssues('test/test_repos.txt', path);

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
      text: 'issue body',
      labels: ['type: bug'],
    };

    const result = await util.getIssueInfo(originalIssue);

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

    let result = await util.getIssueInfo(badIssue);
    assert(result === undefined);
  });
});

describe('createDataset()', function() {
  const projectId = settings.projectId;
  const computeRegion = settings.computeRegion;
  const datasetName = 'testSet';
  const multiLabel = 'false';

  it('should create a Google AutoML Natural Language dataset', function() {
    const location = sinon.spy();
    const create = sinon.stub().returns([
      {
        name: 'dataset/location/378646',
        displayName: 'testSet',
        exampleCount: 0,
        textClassificationDatasetMetadata: {classificationType: 'Single-label'},
        createTime: {seconds: '1537993131', nanos: 193890000},
      },
    ]);

    const mockClient = sinon.stub().returns({
      locationPath: location,
      createDataset: create,
    });

    const autoMlMock = {v1beta1: {AutoMlClient: mockClient}};
    const util = proxyquire('../src/util.js', {
      '@google-cloud/automl': autoMlMock,
    });

    util.createDataset(projectId, computeRegion, datasetName, multiLabel);
    sinon.assert.calledOnce(location);
    assert(location.calledWith(projectId, computeRegion));
  });
  it('should throw an error', function() {
    const location = sinon.spy();
    const create = sinon.stub().returns([
      {
        err: 'error',
        name: 'dataset/location/378646',
        displayName: 'testSet',
        exampleCount: 0,
        textClassificationDatasetMetadata: {classificationType: 'Single-label'},
        createTime: {seconds: '1537993131', nanos: 193890000},
      },
    ]);

    const mockClient = sinon.stub().returns({
      locationPath: location,
      createDataset: create,
    });

    const autoMlMock = {v1beta1: {AutoMlClient: mockClient}};
    const util = proxyquire('../src/util.js', {
      '@google-cloud/automl': autoMlMock,
    });

    util.createDataset(projectId, computeRegion, datasetName, multiLabel);
  });
});

describe('importData()', function() {
  const projectId = settings.projectId;
  const computeRegion = settings.computeRegion;
  const datasetId = '123TEST4567';
  const file = 'gs://testbucket-lcm/testIssues.csv';

  it('should import data into AutoML NL dataset', function() {
    const path = sinon.spy();
    const imports = sinon.stub().returns();

    const mockClient = sinon.stub().returns({
      datasetPath: path,
      importData: imports,
    });

    const autoMlMock = {v1beta1: {AutoMlClient: mockClient}};
    const util = proxyquire('../src/util.js', {
      '@google-cloud/automl': autoMlMock,
    });

    util.importData(projectId, computeRegion, datasetId, file);
    sinon.assert.calledOnce(path);
    assert(path.calledWith(projectId, computeRegion, datasetId));
    sinon.assert.calledOnce(imports);
  });
});
