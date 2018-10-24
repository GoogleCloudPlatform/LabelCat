const fs = require('fs');
const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;
const beforeEach = mocha.beforeEach;
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const assert = require('assert');

describe('makeCSV()', function() {
  const mockSettings = {
    secretToken: 'foo',
  };

  const util = proxyquire('../src/util.js', {
    '../functions/settings.json': mockSettings,
  });

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
        {
          title: 'another issue',
          body: 'more details',
          labels: [{name: 'bug'}],
        },
        {
          title: 'issue',
          body: 'details',
          labels: [{name: 'other'}],
        },
      ],
    };

    const getNext = sinon.stub().returns(issueData);
    const hasNext = sinon.stub();
    hasNext.returns(true);
    hasNext.onCall(1).returns(false);

    const mockGet = sinon.stub().returns(Promise.resolve(issueData));

    octoMock = {
      authenticate: sinon.stub(),
      issues: {getForRepo: mockGet},
      hasNextPage: hasNext,
      getNextPage: getNext,
    };

    const mockSettings = {
      secretToken: 'foo',
    };

    util = proxyquire('../src/util.js', {
      '@octokit/rest': () => octoMock,
      '../functions/settings.json': mockSettings,
    });
  });

  it('should pass new issue object to makeCSV', async () => {
    const label = 'type: bug';
    const alt = ['bug'];
    const result = await util.retrieveIssues('test/test_repos.txt', label, alt);

    assert(result.length === 6);
    assert(result[0].text === 'issue details');
    assert(result[0].label === 1);
    assert(result[1].text === 'another issue more details');
    assert(result[1].label === 1);
  });
  it('should throw an error', async () => {
    let label = 'type: bug';

    const expectedResponse = Promise.reject({
      response: {
        status: 404,
        statusText: 'Not Found',
      },
    });

    octoMock.issues.getForRepo.returns(expectedResponse);

    const result = await util.retrieveIssues('test/test_repos.txt', label);

    assert(result === undefined);
    sinon.assert.calledOnce(octoMock.issues.getForRepo);
    sinon.assert.notCalled(octoMock.hasNextPage);
    sinon.assert.notCalled(octoMock.getNextPage);
  });
});

describe('getIssueInfo()', function() {
  let originalIssue, returnedIssue, labelCount, util;
  beforeEach(() => {
    const mockSettings = {
      secretToken: 'foo',
    };

    util = proxyquire('../src/util.js', {
      '../functions/settings.json': mockSettings,
    });

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
  });

  it('should return issue object with text & labels keys', async function() {
    const result = await util.getIssueInfo(originalIssue);
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

    const mockSettings = {
      secretToken: 'foo',
    };

    const autoMlMock = {v1beta1: {AutoMlClient: mockClient}};
    const util = proxyquire('../src/util.js', {
      '@google-cloud/automl': autoMlMock,
      '../functions/settings.json': mockSettings,
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

    const mockSettings = {
      secretToken: 'foo',
    };

    const autoMlMock = {v1beta1: {AutoMlClient: mockClient}};
    const util = proxyquire('../src/util.js', {
      '@google-cloud/automl': autoMlMock,
      '../functions/settings.json': mockSettings,
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

    const mockSettings = {
      secretToken: 'foo',
    };

    const util = proxyquire('../src/util.js', {
      '@google-cloud/automl': autoMlMock,
      '../functions/settings.json': mockSettings,
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

    const mockSettings = {
      secretToken: 'foo',
    };

    const util = proxyquire('../src/util.js', {
      '@google-cloud/automl': autoMlMock,
      '../functions/settings.json': mockSettings,
    });

    util.importData(projectId, computeRegion, datasetId, file);
  });
});

describe('listDatasets()', function() {
  const projectId = 'test-project';
  const computeRegion = 'us-central1';

  it('should return a list of datasets', async function() {
    const location = sinon.spy();
    const list = sinon.stub().returns([
      [
        {
          name: 'projects/12345/locations/us-central1/datasets/12345',
          displayName: 'testSet',
          createTime: {seconds: '1538180498', nanos: 938685000},
          exampleCount: 100,
          textClassificationDatasetMetadata: {classificationType: 'MULTICLASS'},
          datasetMetadata: 'textClassificationDatasetMetadata',
        },
      ],
    ]);

    const mockClient = sinon.stub().returns({
      locationPath: location,
      listDatasets: list,
    });

    const autoMlMock = {v1beta1: {AutoMlClient: mockClient}};

    const mockSettings = {
      secretToken: 'foo',
    };

    const util = proxyquire('../src/util.js', {
      '@google-cloud/automl': autoMlMock,
      '../functions/settings.json': mockSettings,
    });

    await util.listDatasets(projectId, computeRegion);

    sinon.assert.calledOnce(list);
    sinon.assert.calledOnce(location);
    assert(location.calledWith(projectId, computeRegion));
  });
  it('should throw an error', function() {
    const location = sinon.spy();
    const list = sinon.stub().returns([
      [
        {
          name: 'projects/12345/locations/us-central1/datasets/12345',
          displayName: 'TestSet',
        },
      ],
    ]);

    const mockClient = sinon.stub().returns({
      locationPath: location,
      listDatasets: list,
    });

    const autoMlMock = {v1beta1: {AutoMlClient: mockClient}};

    const mockSettings = {
      secretToken: 'foo',
    };

    const util = proxyquire('../src/util.js', {
      '@google-cloud/automl': autoMlMock,
      '../functions/settings.json': mockSettings,
    });

    util.listDatasets(projectId, computeRegion);
  });
});
// createModel(projectId, computeRegion, datasetId, modelName);
describe('createModel()', function() {
  const projectId = 'test-project';
  const computeRegion = 'us-central1';

  it('should call AutoML NL API to train model', async function() {
    const location = sinon.spy();
    const create = sinon.stub().returns([
      {Operation: 'data'},
      {
        name:
          'projects/203278707824/locations/us-central1/operations/TCN919683525469915167',
        metadata: {
          type_url:
            'type.googleapis.com/google.cloud.automl.v1alpha1.OperationMetadata',
          value: 'Test',
        },
        done: false,
      },
    ]);

    const mockClient = sinon.stub().returns({
      locationPath: location,
      createModel: create,
    });

    const mockSettings = {
      secretToken: 'foo',
    };

    const autoMlMock = {v1beta1: {AutoMlClient: mockClient}};
    const util = proxyquire('../src/util.js', {
      '@google-cloud/automl': autoMlMock,
      '../functions/settings.json': mockSettings,
    });

    await util.createModel(projectId, computeRegion, '123456ABC', 'testModel');

    sinon.assert.calledOnce(create);
    sinon.assert.calledOnce(location);
    assert(location.calledWith(projectId, computeRegion));
  });
  it('should throw an error', async function() {
    const location = sinon.spy();
    const create = sinon.stub().returns([]);

    const mockClient = sinon.stub().returns({
      locationPath: location,
      createModel: create,
    });

    const autoMlMock = {v1beta1: {AutoMlClient: mockClient}};

    const mockSettings = {
      secretToken: 'foo',
    };

    const util = proxyquire('../src/util.js', {
      '@google-cloud/automl': autoMlMock,
      '../functions/settings.json': mockSettings,
    });

    await util.createModel(projectId, computeRegion, '123456ABC', 'testModel');
  });
});
