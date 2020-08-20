const { WebClient, LogLevel } = require("@slack/web-api");
const { DateTime } = require("luxon");
const R = require("ramda");

const getMentions = async (userToken, user, timeRange) => {
  const slack = new WebClient(userToken, {
    logLevel: LogLevel.DEBUG,
  });
  const messages = await slack.search
    .messages({
      query: `@${user}`,
      count: 100,
      highlight: false,
      sort: "timestamp",
    })
    .then(({ messages }) =>
      messages.matches.filter(
        (x) =>
          x.username !== "better_mention_tool" &&
          x.text.includes(`@${user}`) &&
          x.ts >= timeRange.start.toSeconds() &&
          x.ts <= timeRange.end.toSeconds()
      )
    );
  const groupDms = await slack.users
    .conversations({
      limit: 200,
      types: "mpim",
      exclude_archived: false,
      user,
    })
    .then(({ channels }) => channels);
  return messages.map(({ channel, username, text, permalink, ts }) => {
    let channelName = channel.name;
    if (channel.is_im) {
      channelName = `${username}とのDM`;
    } else if (channel.is_mpim && groupDms.some((x) => x.id === channel.id)) {
      const group = groupDms.find((x) => x.id === channel.id);
      channelName = `${group.purpose.value
        .replace(": とグループメッセージ中 ", "")
        .replace(/@/g, "")} とのDM`;
    }
    return {
      channelName,
      username,
      text,
      permalink,
      ts: Number(ts),
    };
  });
};

const resolveMessages = (messages) => {
  if (messages.length === 0) {
    return {
      blocks: [
        {
          type: "section",
          text: {
            type: "plain_text",
            emoji: true,
            text: "新着メンションはありませんでした。",
          },
        },
      ],
    };
  }
  const blocks = [];
  blocks.push({
    type: "section",
    text: {
      type: "plain_text",
      emoji: true,
      text: "新着メンション一覧:",
    },
  });
  blocks.push({
    type: "divider",
  });
  const groupedMessages = R.groupBy((x) => x.channelName)(messages);
  R.keys(groupedMessages).forEach((channelName) => {
    const messages = groupedMessages[channelName];
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*● ${channelName}*`,
      },
    });
    R.sortBy((x) => x.ts)(messages).forEach(
      ({ username, text, permalink, ts }) => {
        const time = DateTime.fromSeconds(ts).setZone("UTC+9");
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `_${time.toFormat("HH:mm:ss")} ${username}_\n${text}\n\n`,
          },
          // accessory: {
          //   type: "button",
          //   text: {
          //     type: "plain_text",
          //     emoji: true,
          //     text: "元メッセージを表示",
          //   },
          //   url: permalink,
          //   style: "primary",
          // },
        });
        blocks.push({
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `<${permalink}|元メッセージを表示>`,
            },
          ],
        });
      }
    );
    blocks.push({
      type: "divider",
    });
  });
  return { blocks };
};

module.exports = {
  getMentions,
  resolveMessages,
};
