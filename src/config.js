require("dotenv").config();

module.exports = {
  slack: {
    singingSecret: process.env.SLACK_SIGNING_SECRET,
    botToken: process.env.SLACK_BOT_TOKEN,
    userToken: process.env.SLACK_USER_TOKEN,
  },
  aws: {
    s3Bucket: process.env.AWS_S3_BUCKET,
  },
};
