const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');
const assert = require('assert');

let functions, autoMlMock, octoMock, dataBuffer, mockSettings;

beforeEach(() => {
  const data = JSON.stringify({
    owner: 'GoogleCloudPlatform',
    repo: 'labelcat',
    number: 22,
    text: 'some issue information',
  });

  dataBuffer = Buffer.from(data);

  const reject = sinon.stub();
  reject.withArgs(true).throws(401);

  const mockAdd = sinon.stub().returns(
    Promise.resolve({
      data: [
        {
          id: 271022241,
          node_id: 'MDU6TGFiZWwyNzEwMjIyNDE=',
          url:
            'https://api.github.com/repos/GoogleCloudPlatform/LabelCat/labels/bug',
          name: 'bug',
          color: 'fc2929',
          default: true,
        },
      ],
      status: 200,
    })
  );

  octoMock = {
    authenticate: sinon.stub(),
    issues: {addLabels: mockAdd},
  };

  const model = sinon.spy();
  const predict = sinon.stub();

  predict.onCall(0).returns([
    {
      payload: [
        {
          annotationSpecId: '',
          displayName: '0',
          classification: [Object],
          detail: 'classification',
        },
        {
          annotationSpecId: '',
          displayName: '1',
          classification: {score: 90},
          detail: 'classification',
        },
      ],
    },
  ]);

  predict.onCall(1).returns([
    {
      payload: [
        {
          annotationSpecId: '',
          displayName: '0',
          classification: [Object],
          detail: 'classification',
        },
        {
          annotationSpecId: '',
          displayName: '1',
          classification: {score: 80},
          detail: 'classification',
        },
      ],
    },
  ]);

  const mockClient = sinon.stub().returns({
    modelPath: model,
    predict: predict,
  });

  autoMlMock = {v1beta1: {PredictionServiceClient: mockClient}};

  mockSettings = {
    secretToken: 'foo',
    projectId: 'test-project',
    computeRegion: 'uscentral',
    topicName: 'testTopic',
    modelId: 'test-model',
  };
});

describe('triage()', function() {
  it('should run prediction and returns correct boolean', async () => {
    functions = proxyquire('../functions/index.js', {
      '@octokit/rest': () => octoMock,
      '@google-cloud/automl': autoMlMock,
      '@google-cloud/pubsub': sinon.stub(),
      './settings.json': mockSettings,
    });

    let result = await functions.triage({data: {data: dataBuffer}});

    assert(result.labeled === true);
    assert(result.number === 22);
    result = await functions.triage({data: {data: dataBuffer}});
    assert(result.labeled === false);
    assert(result.number === 22);
  });

  it('should throw error if unauthorized gitHub user', async () => {
    functions = proxyquire('../functions/index.js', {
      './settings.json': mockSettings,
      '@google-cloud/pubsub': sinon.stub(),
    });

    let result = await functions.triage({data: {data: dataBuffer}});
    assert(result.labeled === false);
    assert(result.number === 22);
  });
});
