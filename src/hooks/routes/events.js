const log4js = require("log4js");
const { createEventAdapter } = require("@slack/events-api");
const aws = require("aws-sdk");
const config = require("../../config");

const logger = log4js.getLogger("slack/hooks/events");
const defaultSetting = {
  schedule: "9 12 15 18",
};

const slackEvents = createEventAdapter(config.slack.singingSecret, {
  waitForResponse: true,
});
slackEvents.on("error", (e) => logger.error(e));
slackEvents.on("app_home_opened", async (message) => {
  // 初期化処理
  logger.info("recieved app_home_opened: ", message);
  const { user, channel } = message;
  const s3 = new aws.S3();
  const listObjectsResponse = await s3
    .listObjectsV2({ Bucket: config.aws.s3Bucket })
    .promise();
  logger.info("listObjectsResponse: ", listObjectsResponse);
  if (!listObjectsResponse.Contents.some((x) => x.Key === `${channel}.json`)) {
    const putObjectResponse = await s3
      .putObject({
        Bucket: config.aws.s3Bucket,
        Key: `${channel}.json`,
        Body: JSON.stringify({ user, channel, ...defaultSetting }),
      })
      .promise();
    logger.info("putObjectResponse: ", putObjectResponse);
  }
});

slackEvents.on("im_close", async (message) => {
  // アンインストール処理
  logger.info("recieved im_close: ", message);
  const { channel } = message;
  const s3 = new aws.S3();
  const listObjectsResponse = await s3
    .listObjectsV2({ Bucket: config.aws.s3Bucket })
    .promise();
  logger.info("listObjectsResponse: ", listObjectsResponse);
  if (listObjectsResponse.Contents.some((x) => x.Key === `${channel}.json`)) {
    const deleteObjectResponse = await s3
      .deleteObject({
        Bucket: config.aws.s3Bucket,
        Key: `${channel}.json`,
      })
      .promise();
    logger.info("deleteObjectResponse: ", deleteObjectResponse);
  }
});

module.exports = slackEvents.expressMiddleware();
