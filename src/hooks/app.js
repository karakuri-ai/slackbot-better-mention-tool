const express = require("express");
const bodyParser = require("body-parser");
const log4js = require("log4js");
const events = require("./routes/events");
const commands = require("./routes/commands");

const logger = log4js.getLogger("express");
const app = express();
const rawBodyParser = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || "utf8");
  }
};
app.use("/hooks/events", events);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true, verify: rawBodyParser }));
app.use(
  log4js.connectLogger(logger, {
    level: log4js.levels.DEBUG.levelStr,
    format: ":method :url :status - :response-time ms",
  })
);
app.use((req, res, next) => {
  if (req.body) {
    logger.debug("request body:", req.body);
  }
  next();
});
app.use("/hooks/commands", commands);

module.exports = app;
