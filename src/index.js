const awsServerlessExpress = require("aws-serverless-express");
const log4js = require("log4js");
const app = require("./hooks/app");
const { responder } = require("./responder");
const { scheduler } = require("./scheduler");

log4js.configure({
  appenders: {
    stdout: { type: "stdout", layout: { type: "basic" } },
  },
  categories: {
    default: {
      appenders: ["stdout"],
      level: "debug",
    },
  },
});
const server = awsServerlessExpress.createServer(app);

exports.hooks = (event, context) => {
  awsServerlessExpress.proxy(server, event, context);
};
exports.responder = responder;
exports.scheduler = scheduler;
