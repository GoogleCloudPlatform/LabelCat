const settings = require('./settings.json'); // eslint-disable-line node/no-missing-require
const crypto = require('crypto');
const log = require('loglevel');
log.setLevel('info');
const automl = require('@google-cloud/automl');
const PubSub = require(`@google-cloud/pubsub`);
const octokit = require('@octokit/rest')();

/**
 * TODO(developer): Set the following...
 */
// Your Google Cloud Platform project ID & compute region
const projectId = settings.projectId;
const computeRegion = settings.computeRegion;
// Your Google Cloud AutoML NL model ID
const modelId = settings.modelId;
// Your Google Cloud Pub/Sub topic
const topicName = settings.topicName;
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
      .createHmac('sha1', settings.secretToken)
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
    const text = req.body.issue.title + ' ' + req.body.issue.body;
    const data = JSON.stringify({
      owner: req.body.repository.owner.login,
      repo: req.body.repository.name,
      number: req.body.issue.number,
      text: text,
    });
    const dataBuffer = Buffer.from(data);

    const pubsubClient = new PubSub({
      projectId: projectId,
    });

    const response = await pubsubClient
      .topic(topicName)
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
    token: settings.secretToken,
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
  const client = new automl.v1beta1.PredictionServiceClient();

  const modelFullId = client.modelPath(projectId, computeRegion, modelId);

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

    if (response[0].payload[1].classification.score > 89) {
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
