const fs = require('fs');
const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;
const beforeEach = mocha.beforeEach;
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');
const assert = require('assert');

function getMocks() {
  const path = sinon.stub();
  const imports = sinon.stub().returns();
  const location = sinon.spy();
  const create = sinon.stub();
  const list = sinon.stub();
  const getNext = sinon.stub();
  const hasNext = sinon.stub();
  const getRepoMock = sinon.stub();

  const settingsMock = {
    secretToken: 'foo',
  };

  const octoMock = {
    authenticate: sinon.stub(),
    issues: {getForRepo: getRepoMock},
    hasNextPage: hasNext,
    getNextPage: getNext,
  };

  const clientMock = sinon.stub().returns({
    datasetPath: path,
    importData: imports,
    locationPath: location,
    createDataset: create,
    listDatasets: list,
    createModel: create,
  });

  const autoMlMock = {v1beta1: {AutoMlClient: clientMock}};

  return {
    util: proxyquire('../src/util.js', {
      '@google-cloud/automl': autoMlMock,
      '../functions/settings.json': settingsMock,
      '@octokit/rest': () => octoMock,
    }),
    mocks: {
      list: list,
      path: path,
      create: create,
      imports: imports,
      getNext: getNext,
      hasNext: hasNext,
      location: location,
      clientMock: clientMock,
      autoMlMock: autoMlMock,
      getRepoMock: getRepoMock,
      settingsMock: settingsMock,
    },
  };
}

describe('makeCSV()', function() {
  const settingsMock = {
    secretToken: 'foo',
  };

  const util = proxyquire('../src/util.js', {
    '../functions/settings.json': settingsMock,
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
  let mockData;

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

    mockData = getMocks();
    mockData.mocks.getNext.returns(issueData);
    mockData.mocks.hasNext.returns(true);
    mockData.mocks.hasNext.onCall(1).returns(false);
    mockData.mocks.getRepoMock.returns(Promise.resolve(issueData));
  });

  it('should pass new issue object to makeCSV', async () => {
    const label = 'type: bug';
    const alt = ['bug'];
    const result = await mockData.util.retrieveIssues(
      'test/test_repos.txt',
      label,
      alt
    );

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

    mockData.mocks.getRepoMock.returns(expectedResponse);
    mockData.mocks.hasNextPage = sinon.spy();
    mockData.mocks.getNextPage = sinon.spy();

    const result = await mockData.util.retrieveIssues(
      'test/test_repos.txt',
      label
    );

    assert(result === undefined);
    sinon.assert.calledOnce(mockData.mocks.getRepoMock);
    sinon.assert.notCalled(mockData.mocks.hasNextPage);
    sinon.assert.notCalled(mockData.mocks.getNextPage);
  });
});

describe('getIssueInfo()', function() {
  let originalIssue, returnedIssue, labelCount, mockData;

  beforeEach(() => {
    mockData = getMocks();

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
    const result = await mockData.util.getIssueInfo(originalIssue);

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

    const result = await mockData.util.getIssueInfo(badIssue, labelCount);
    assert(result === undefined);
  });
});

describe('createDataset()', function() {
  let mockData;
  const projectId = 'test-project';
  const computeRegion = 'us-central1';
  const datasetName = 'testSet';
  const multiLabel = 'false';

  beforeEach(() => {
    mockData = getMocks();
  });

  it('should create a Google AutoML Natural Language dataset', function() {
    mockData.mocks.create.returns([
      {
        name: 'dataset/location/378646',
        displayName: 'testSet',
        exampleCount: 0,
        textClassificationDatasetMetadata: {classificationType: 'Single-label'},
        createTime: {seconds: '1537993131', nanos: 193890000},
      },
    ]);

    mockData.util.createDataset(
      projectId,
      computeRegion,
      datasetName,
      multiLabel
    );

    sinon.assert.calledOnce(mockData.mocks.location);
    assert(mockData.mocks.location.calledWith(projectId, computeRegion));
  });

  it('should throw an error', function() {
    mockData.mocks.create.returns([
      {
        err: 'error',
        name: 'dataset/location/378646',
        displayName: 'testSet',
        exampleCount: 0,
        textClassificationDatasetMetadata: {classificationType: 'Single-label'},
        createTime: {seconds: '1537993131', nanos: 193890000},
      },
    ]);

    mockData.util.createDataset(
      projectId,
      computeRegion,
      datasetName,
      multiLabel
    );
  });
});

describe('importData()', function() {
  let mockData;

  const projectId = 'test-project';
  const computeRegion = 'us-central1';
  const datasetId = '123TEST4567';
  const file = 'gs://testbucket-lcm/testIssues.csv';

  beforeEach(() => {
    mockData = getMocks();
  });

  it('should import data into AutoML NL dataset', function() {
    mockData.util.importData(projectId, computeRegion, datasetId, file);

    sinon.assert.calledOnce(mockData.mocks.path);
    assert(mockData.mocks.path.calledWith(projectId, computeRegion, datasetId));
    sinon.assert.calledOnce(mockData.mocks.imports);
  });

  it('should throw an error', function() {
    mockData.mocks.imports.throws();
    mockData.util.importData(projectId, computeRegion, datasetId, file);
  });
});

describe('listDatasets()', function() {
  let mockData;
  const projectId = 'test-project';
  const computeRegion = 'us-central1';

  beforeEach(() => {
    mockData = getMocks();
  });

  it('should return a list of datasets', async function() {
    mockData.mocks.list.returns([
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

    await mockData.util.listDatasets(projectId, computeRegion);

    sinon.assert.calledOnce(mockData.mocks.list);
    sinon.assert.calledOnce(mockData.mocks.location);
    assert(mockData.mocks.location.calledWith(projectId, computeRegion));
  });

  it('should throw an error', function() {
    mockData.mocks.list.returns([
      [
        {
          name: 'projects/12345/locations/us-central1/datasets/12345',
          displayName: 'TestSet',
        },
      ],
    ]);

    mockData.util.listDatasets(projectId, computeRegion);
  });
});

describe('createModel()', function() {
  let mockData;
  const projectId = 'test-project';
  const computeRegion = 'us-central1';

  beforeEach(() => {
    mockData = getMocks();
  });

  it('should call AutoML NL API to train model', async function() {
    mockData.mocks.create.returns([
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

    await mockData.util.createModel(
      projectId,
      computeRegion,
      '123456ABC',
      'testModel'
    );

    sinon.assert.calledOnce(mockData.mocks.create);
    sinon.assert.calledOnce(mockData.mocks.location);
    assert(mockData.mocks.location.calledWith(projectId, computeRegion));
  });

  it('should throw an error', async function() {
    mockData.mocks.create.returns([]);

    await mockData.util.createModel(
      projectId,
      computeRegion,
      '123456ABC',
      'testModel'
    );
  });
});
