const aws = require("aws-sdk");
const { Future } = require("funfix");
const { DateTime } = require("luxon");
const R = require("ramda");
const { WebClient, LogLevel } = require("@slack/web-api");
const config = require("./config");
const { getMentions, resolveMessages } = require("./service");

const postMentionList = async (settings, now) => {
  const { schedule, user, channel } = settings;
  if (!schedule.includes(now.hour)) {
    return;
  }
  const start = schedule.some((x) => x < now.hour)
    ? now.set({
        hour: R.findLast((x) => x < now.hour)(schedule),
        minute: 0,
        second: 0,
      })
    : now
        .set({
          hour: R.last(schedule),
          minute: 0,
          second: 0,
        })
        .minus({ days: 1 });
  const end = now.set({
    minute: 0,
    second: 0,
  });
  const mentions = await getMentions(config.slack.userToken, user, {
    start,
    end,
  });
  const payload = resolveMessages(mentions);
  const slack = new WebClient(config.slack.botToken, {
    logLevel: LogLevel.DEBUG,
  });
  await slack.chat.postMessage({
    channel,
    text: `<@${user}>新着メンション一覧`,
    ...payload,
  });
};

const scheduler = async (event, context) => {
  const s3 = new aws.S3();
  const keys = await s3
    .listObjectsV2({ Bucket: config.aws.s3Bucket })
    .promise()
    .then((x) => x.Contents.map((_) => _.Key));
  const settings = await Future.traverse(keys)((key) =>
    Future.fromPromise(
      s3
        .getObject({ Bucket: config.aws.s3Bucket, Key: key })
        .promise()
        .then((x) => {
          const setting = JSON.parse(x.Body.toString("utf8"));
          return {
            ...setting,
            schedule: setting.schedule.split(" ").map((_) => Number(_)),
          };
        })
    )
  );
  const now = DateTime.utc().setZone("UTC+9");
  await Future.traverse(
    settings,
    1
  )((x) => Future.fromPromise(postMentionList(x, now)));
};

module.exports = {
  scheduler,
};
