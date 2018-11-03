const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');
const assert = require('assert');

// update this value to match SCORE_THRESHOLD in functions/index.js
const SCORE_THRESHOLD = 70;
const ISSUE_NUMBER = 22;

let functions, autoMlMock, octoMock, dataBuffer, settingsMock;

const makePayload = (classification, displayName) => {
  return {
    annotationSpecId: '',
    displayName: displayName,
    classification: classification,
    detail: 'classification',
  };
};

beforeEach(() => {
  const data = JSON.stringify({
    owner: 'GoogleCloudPlatform',
    repo: 'labelcat',
    number: ISSUE_NUMBER,
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
          node_id: 'MDwMjIyNDE=',
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
      payload: [makePayload([Object], 0), makePayload({score: 90}, 1)],
    },
  ]);

  predict.onCall(1).returns([
    {
      payload: [
        makePayload([Object], 0),
        makePayload({score: SCORE_THRESHOLD}, 1),
      ],
    },
  ]);

  const clientMock = sinon.stub().returns({
    modelPath: model,
    predict: predict,
  });

  autoMlMock = {v1beta1: {PredictionServiceClient: clientMock}};

  settingsMock = {
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
      './settings.json': settingsMock,
    });

    let result = await functions.triage({data: {data: dataBuffer}});
    assert(result.labeled === true);
    assert(result.number === ISSUE_NUMBER);
    result = await functions.triage({data: {data: dataBuffer}});
    assert(result.labeled === false);
    assert(result.number === ISSUE_NUMBER);
  });

  it('should throw error if unauthorized gitHub user', async () => {
    functions = proxyquire('../functions/index.js', {
      './settings.json': settingsMock,
      '@google-cloud/pubsub': sinon.stub(),
    });

    let result = await functions.triage({data: {data: dataBuffer}});
    assert(result.labeled === false);
    assert(result.number === ISSUE_NUMBER);
  });
});
