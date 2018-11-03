const express = require('express');
const issueEvent = require('./issuePayload.js');
const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;
const beforeEach = mocha.beforeEach;
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');
const assert = require('assert');
const supertest = require(`supertest`);
const bodyParser = require('body-parser');
const crypto = require('crypto');

const settingsMock = {
  secretToken: 'foo',
};

function setup() {
  let event = issueEvent;
  return {
    getHeader: () => {
      const digest = crypto
        .createHmac('sha1', settingsMock.secretToken)
        .update(JSON.stringify(event.body))
        .digest('hex');
      return `sha1=${digest}`;
    },
  };
}

describe('handleNewIssue()', function() {
  let app, codeUnderTest, functs;

  const publishMock = sinon.stub().returns('123');
  const publisherMock = sinon.stub().returns({publish: publishMock});
  const topicMock = sinon.stub().returns({publisher: publisherMock});
  const pubsubMock = sinon.stub().returns({topic: topicMock});

  beforeEach(() => {
    codeUnderTest = setup();
    app = express();
    const requestLimit = '1024mb';

    const rawBody = (req, res, buf) => {
      req.rawBody = buf;
    };

    const defaultBodyOptions = {
      limit: requestLimit,
      verify: rawBody,
    };

    const rawBodyOptions = {
      limit: requestLimit,
      verify: rawBody,
      type: '*/*',
    };

    // Use extended query string parsing for URL-encoded bodies.
    const urlEncodedOptions = {
      limit: requestLimit,
      verify: rawBody,
      extended: true,
    };

    // Parse request body
    app.use(bodyParser.json(defaultBodyOptions));
    app.use(bodyParser.text(defaultBodyOptions));
    app.use(bodyParser.urlencoded(urlEncodedOptions));

    // MUST be last in the list of body parsers as subsequent parsers will be
    // skipped when one is matched.
    app.use(bodyParser.raw(rawBodyOptions));

    functs = proxyquire('../functions/index.js', {
      '@google-cloud/pubsub': pubsubMock,
      './settings.json': settingsMock,
    });

    app.post(`/handleNewIssue`, functs.handleNewIssue);
  });

  afterEach(() => {
    issueEvent.body.action = 'opened';
    issueEvent.body.issue.title = 'LABELCAT-TEST';
  });

  it('should validate request', function(done) {
    supertest(app)
      .post(`/handleNewIssue`)
      .send(issueEvent.body)
      .set('x-hub-signature', 'foo')
      .end(function(err, res) {
        assert.strictEqual(403, res.statusCode);
        sinon.assert.notCalled(publishMock);
        done();
      });
  });

  it('should publish message and return messageId', function(done) {
    supertest(app)
      .post(`/handleNewIssue`)
      .send(issueEvent.body)
      .set('x-hub-signature', codeUnderTest.getHeader())
      .end(function(err, res) {
        assert.strictEqual(200, res.statusCode);
        assert.strictEqual('123', res.text);
        sinon.assert.calledOnce(publishMock);
        done();
      });
  });

  it('should return if action is not opened', function(done) {
    issueEvent.body.action = 'edited';
    supertest(app)
      .post(`/handleNewIssue`)
      .send(issueEvent.body)
      .set('x-hub-signature', codeUnderTest.getHeader())
      .end(function(err, res) {
        assert.strictEqual(400, res.statusCode);
        assert.ok(res.text === 'Wrong action.');
        done();
      });
  });

  it('should not publish request with incorrect data', function(done) {
    issueEvent.body.action = 'opened';
    issueEvent.body.issue.title = undefined;
    supertest(app)
      .post(`/handleNewIssue`)
      .send({body: null})
      .set('x-hub-signature', codeUnderTest.getHeader())
      .end(function(err, res) {
        assert.strictEqual(400, res.statusCode);
        done();
      });
  });
});
