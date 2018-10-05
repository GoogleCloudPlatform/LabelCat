const util = require('../src/util.js');
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
        text: 'more info',
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

describe('cleanLabels()', function() {
  it('should remove issues with labels that appear < 100 times in dataset', function() {
    const issue = [
      {
        text: 'title body',
        labels: ['type: bug', 'testing'],
      },
    ];

    const labelCount = {
      'type: bug': 99,
      testing: 99,
    };

    const result = util.cleanLabels(issue, labelCount);

    assert(result.length === 0);
  });
});

describe('retrieveIssues', () => {
  let util, octoMock;

  beforeEach(() => {
    const issueData = {
      data: [
        {
          title: 'issue',
          body: 'details',
          labels: [{name: 'type: bug'}],
        },
      ],
    };

    const getNext = sinon.stub().returns(issueData);
    const hasNext = sinon.stub();
    hasNext.returns(true);
    hasNext.onCall(99).returns(false);

    const mockGet = sinon.stub().returns(Promise.resolve(issueData));

    octoMock = {
      authenticate: sinon.stub(),
      issues: {getForRepo: mockGet},
      hasNextPage: hasNext,
      getNextPage: getNext,
    };
    util = proxyquire('../src/util.js', {
      '@octokit/rest': () => octoMock,
    });
  });

  it('should pass new issue object to makeCSV', async () => {
    const path = __dirname + '/' + 'test.csv';

    const result = await util.retrieveIssues('test/test_repos.txt', path);

    assert(result.length === 100);
    assert(result[0].text === 'issue details');
    assert(result[0].label0 === 'type: bug');
  });

  it('should throw an error', async () => {
    const path = __dirname + '/' + 'test.csv';

    const expectedResponse = Promise.reject({
      response: {
        status: 404,
        statusText: 'Not Found',
      },
    });

    octoMock.issues.getForRepo.returns(expectedResponse);

    const result = await util.retrieveIssues('test/test_repos.txt', path);

    assert(result === undefined);
    sinon.assert.calledOnce(octoMock.issues.getForRepo);
    sinon.assert.notCalled(octoMock.hasNextPage);
    sinon.assert.notCalled(octoMock.getNextPage);
  });
});

describe('getIssueInfo()', function() {
  let originalIssue, returnedIssue, labelCount;
  beforeEach(() => {
    originalIssue = {
      id: 1,
      node_id: 'MDU6SXNWUx',
      number: 1,
      repository_url: 'http://github.com/fakerepo',
      state: 'open',
      title: 'title',
      body: 'body',
      labels: [{name: 'type: bug'}],
    };

    returnedIssue = {
      text: 'title body',
      labels: ['type: bug'],
    };

    labelCount = {
      'type: bug': 100,
    };
  });

  it('should return issue object with text & labels keys', async function() {
    const result = await util.getIssueInfo(originalIssue, labelCount);

    assert.strictEqual(
      Object.keys(result).length,
      Object.keys(returnedIssue).length
    );
    assert.strictEqual(Object.keys(result)[0], Object.keys(returnedIssue)[0]);
    assert(result.text === 'title body');
  });

  it('should throw an error', async () => {
    const badIssue = {
      repository_url: 'http://github.com/fakerepo',
      title: 'issue title',
      body: 'issue body',
    };

    let result = await util.getIssueInfo(badIssue, labelCount);
    assert(result === undefined);
  });
});

describe('createDataset()', function() {
  const projectId = 'test-project';
  const computeRegion = 'us-central1';
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
  const projectId = 'test-project';
  const computeRegion = 'us-central1';
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
  it('should throw an error', function() {
    const path = sinon.spy();
    const imports = sinon.stub().throws();

    const mockClient = sinon.stub().returns({
      datasetPath: path,
      importData: imports,
    });

    const autoMlMock = {v1beta1: {AutoMlClient: mockClient}};
    const util = proxyquire('../src/util.js', {
      '@google-cloud/automl': autoMlMock,
    });

    util.importData(projectId, computeRegion, datasetId, file);
  });
});
