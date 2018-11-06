const settings = require('./settings.json'); // eslint-disable-line node/no-missing-require
const crypto = require('crypto');
const log = require('loglevel');
log.setLevel('info');
const automl = require('@google-cloud/automl');
const PubSub = require(`@google-cloud/pubsub`);
const octokit = require('@octokit/rest')();
const client = new automl.v1beta1.PredictionServiceClient();

const PROJECT_ID = settings.PROJECT_ID;
const COMPUTE_REGION = settings.COMPUTE_REGION;
const MODEL_ID = settings.MODEL_ID;
const TOPIC_NAME = settings.TOPIC_NAME;
const SECRET_TOKEN = settings.SECRET_TOKEN;
const SCORE_THRESHOLD = 70;

/**
 * Verifies request has come from Github and publishes
 * message to specified Pub/Sub topic.
 *
 * @param {object} req
 * @param {object} res
 */
async function handleNewIssue(req, res) {
  try {
    if (req.body.action !== 'opened') {
      res.status(400).send('Wrong action.');
      return;
    }

    await validateRequest(req);
    const messageId = await publishMessage(req);
    res.status(200).send(messageId);
  } catch (err) {
    log.error(err.stack);
    res.status(403).send({error: err.message});
  }
}

function validateRequest(req) {
  return Promise.resolve().then(() => {
    const digest = crypto
      .createHmac('sha1', SECRET_TOKEN)
      .update(JSON.stringify(req.body))
      .digest('hex');
    if (req.headers['x-hub-signature'] !== `sha1=${digest}`) {
      const error = new Error('Unauthorized');
      error.statusCode = 403;
      throw error;
    }
  });
}

async function publishMessage(req) {
  try {
    const text = `${req.body.issue.title} ${req.body.issue.body}`;
    const data = JSON.stringify({
      owner: req.body.repository.owner.login,
      repo: req.body.repository.name,
      number: req.body.issue.number,
      text: text,
    });
    const dataBuffer = Buffer.from(data);

    const pubsubClient = new PubSub({
      PROJECT_ID: PROJECT_ID,
    });

    const response = await pubsubClient
      .topic(TOPIC_NAME)
      .publisher()
      .publish(dataBuffer);
    return response;
  } catch (err) {
    log.error('ERROR:', err);
  }
}

async function triage(event, res) {
  octokit.authenticate({
    type: 'oauth',
    token: settings.SECRET_TOKEN,
  });

  const pubSubMessage = event.data;
  let issueData = Buffer.from(pubSubMessage.data, 'base64').toString();
  issueData = JSON.parse(issueData);
  const owner = issueData.owner;
  const repo = issueData.repo;
  const number = issueData.number;

  try {
    issueData.labeled = false;
    let results = await predict(issueData.text);

    if (results) {
      const labels = ['bug'];
      const response = await octokit.issues.addLabels({
        owner: owner,
        repo: repo,
        number: number,
        labels: labels,
      });

      if (response.status === 200) {
        issueData.labeled = true;
      }
    }

    return issueData;
  } catch (err) {
    res.status(403).send({error: err.message});
  }
}

async function predict(text) {
  const modelFullId = client.modelPath(PROJECT_ID, COMPUTE_REGION, MODEL_ID);

  const payload = {
    textSnippet: {
      content: text,
      mimeType: `text/plain`,
    },
  };

  try {
    const response = await client.predict({
      name: modelFullId,
      payload: payload,
      params: {},
    });

    if (response[0].payload[1].classification.score > SCORE_THRESHOLD) {
      return true;
    }

    return false;
  } catch (err) {
    log.error(err);
  }
}

module.exports = {
  handleNewIssue,
  triage,
};
