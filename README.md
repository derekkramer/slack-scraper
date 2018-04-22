# Node.js Slack Channel Scraper

The following code pulls a full channel history from the Slack API, exports
the message and user data to .json files, then parses an HTML mockup of
the history in a similar style to Slack.

### Prerequisites

Am installation of Node.js is required in order to run this Slack scraper. Download the packaged installer directly from [nodejs.org](https://nodejs.org/) or if you're using a Mac, you can install it with Homebrew.

Open a terminal window and run:

```
$ brew install node
```

### Running the code

To use, set the `token` variable to your legacy user token;  
_(Issue a legacy token from the [Slack API Help Center](https://api.slack.com/custom-integrations/legacy-tokens))_

then set the `channel` variable to the internal channel id of the channel you want to scrape.  
_(Find a channel's id with the test tool in the [Slack API](https://api.slack.com/methods/channels.list/test) documentation)_

Finally, in the console, `cd` into the directory and run:

```
$ node app.js
```

then open `data/history.html` in a browser.