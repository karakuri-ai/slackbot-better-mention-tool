const { DateTime } = require("luxon");
const log4js = require("log4js");
const axios = require("axios");
const aws = require("aws-sdk");
const config = require("./config");
const { getMentions, resolveMessages } = require("./service");

const logger = log4js.getLogger("slack/responder");

const createHtttpClient = () => {
  const client = axios.create();
  client.interceptors.request.use((req) => {
    logger.debug(
      `req: ${req.method.toUpperCase()} ${req.url}  ${
        req.data && req.data.toString().includes("FormData")
          ? "FormData"
          : JSON.stringify(req.data)
      }`
    );
    return req;
  });
  client.interceptors.response.use(
    (res) => {
      logger.debug(
        `res: ${res.status} ${
          res.statusText
        } (${res.config.method.toUpperCase()} ${
          res.config.url
        }) ${JSON.stringify(res.data)}`
      );
      return res;
    },
    (error) => {
      logger.error(
        `error: ${error.name}: ${
          error.message
        } (${error.config.method.toUpperCase()}) ${error.config.url}`
      );
      throw error;
    }
  );
  return client;
};

const responder = async (event, context) => {
  logger.info(event, context);
  const options = event.text.split(" ");
  const client = createHtttpClient();
  if (options[0] === "list") {
    const now = DateTime.utc().setZone("UTC+9");
    const timeRange = {
      start: now.minus({ hours: Number(options[1]) }),
      end: now,
    };
    const mentions = await getMentions(
      config.slack.userToken,
      event.user_id,
      timeRange
    );
    const payload = resolveMessages(mentions);
    await client.post(event.response_url, payload);
    return;
  }
  if (options[0] === "schedule") {
    const s3 = new aws.S3();
    const settings = await s3
      .getObject({
        Bucket: config.aws.s3Bucket,
        Key: `${event.channel_id}.json`,
      })
      .promise()
      .then((x) => JSON.parse(x.Body.toString("utf8")));
    await s3
      .putObject({
        Bucket: config.aws.s3Bucket,
        Key: `${event.channel_id}.json`,
        Body: JSON.stringify({
          ...settings,
          schedule: event.text.replace("schedule ", "").trim(),
        }),
      })
      .promise();
    return;
  }
};

module.exports = {
  responder,
};
