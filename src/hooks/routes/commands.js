const log4js = require("log4js");
const { verifyRequestSignature } = require("@slack/events-api");
const express = require("express");
const aws = require("aws-sdk");
const config = require("../../config");

const logger = log4js.getLogger("slack/hooks/commands");
const commandHelpText = `
* 直近n時間のメンション一覧を取得
\`/mention list {n}\`
例. 直近3時間のメンション一覧を取得: \`/mention list 3\`

* メンションの定期通知のスケジュールを設定
\`/mention schedule {schedule list}\`
例. 9時, 15時, 18時にメンション通知するよう設定: \`/mention schedule 9 15 18\`
`;

const router = express.Router();
router.post("/", async (req, res) => {
  const requestVerified = verifyRequestSignature({
    signingSecret: config.slack.singingSecret,
    requestSignature: req.headers["x-slack-signature"],
    requestTimestamp: parseInt(req.headers["x-slack-request-timestamp"], 10),
    body: req.rawBody,
  });
  if (!requestVerified) {
    res.status(403).end();
    return;
  }
  const options = req.body.text.split(" ");
  const command = options[0];
  if (command === "list") {
    const lambda = new aws.Lambda();
    await lambda
      .invokeAsync({
        FunctionName: config.app.responderFunctionName,
        InvokeArgs: JSON.stringify(req.body),
      })
      .promise();
    res.header("Content-Type", "text/plain;charset=utf-8");
    res.end(
      `直近 ${options[1]} 時間のメンションをまとめる君！\nまとめた結果の表示まで少し時間がかかります。`
    );
    return;
  }
  if (command === "schedule") {
    const lambda = new aws.Lambda();
    await lambda
      .invokeAsync({
        FunctionName: config.app.responderFunctionName,
        InvokeArgs: JSON.stringify(req.body),
      })
      .promise();
    res.header("Content-Type", "text/plain;charset=utf-8");
    res.end(
      `通知スケジュールを設定しました！\n\n${options
        .filter((x, i) => i !== 0)
        .map((x) => `${x}時`)
        .join("\n")}\n\nに通知します！`
    );
    return;
  }
  if (command === "help") {
    res.header("Content-Type", "text/plain;charset=utf-8");
    res.end(commandHelpText);
    return;
  }
  res.status(404).end();
});

module.exports = router;
