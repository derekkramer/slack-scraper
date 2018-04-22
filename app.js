
//
//  Node.js Slack Channel Scraper
//
//
//  The following code pulls a full channel history from the Slack API, exports
//  the message and user data to .json files, then parses an HTML mockup of
//  the history in a similar style to Slack.
//
//  To use, set the `token` variable to your legacy user token;
//  (Issue a legacy token at https://api.slack.com/custom-integrations/legacy-tokens)
//
//  then set the `channel` variable to the internal channel id of the channel you want to scrape.
//  (Find a channel's id with the Slack API at https://api.slack.com/methods/channels.list/test)
//
//  Finally just run `node app.js` in the console and open `data/history.html`.
//

const https = require('https');
const fs = require('fs');

const token = 'INSERT_TOKEN_HERE';
const channel = 'INSERT_CHANNEL_ID_HERE';

let users;
let messages;

let messagesAPIData = [];

function createDirectory() {
    return new Promise(resolve => {
        if (!fs.existsSync('./data')) {
            fs.mkdir('./data', (err) => {
                if(err) console.log(err);

                resolve();
            });
        } else {
            resolve();
        }
    });
}

function getMessages(timestamp) {
    return new Promise(resolve => {
        https.get(`https://slack.com/api/channels.history?token=${token}&channel=${channel}&pretty=1&latest=${timestamp || ''}`, (res) => {
            const {statusCode} = res;
            const contentType = res.headers['content-type'];

            let error;
            if (statusCode !== 200) {
                error = new Error('Request Failed.\n' + `Status Code: ${statusCode}`);
            } else if (!/^application\/json/.test(contentType)) {
                error = new Error('Invalid content-type.\n' + `Expected application/json but received ${contentType}`);
            }
            if (error) {
                console.error(error.message);
                // consume response data to free up memory
                res.resume();
                return;
            }

            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', (chunk) => {
                rawData += chunk;
            });
            res.on('end', () => {
                try {
                    let parsedData = JSON.parse(rawData);
                    messagesAPIData = messagesAPIData.concat(parsedData.messages);

                    if (parsedData.has_more) {
                        resolve(getMessages(parsedData.messages[parsedData.messages.length - 1].ts));
                    } else {
                        messages = messagesAPIData;

                        fs.writeFile('./data/messages.json', JSON.stringify(messages), (err) => {
                            if (err) console.log(err);

                            console.log('> Successfully downloaded and wrote Messages to messages.json');
                            resolve();
                        });
                    }
                } catch (e) {
                    console.error(e.message);
                }
            });
        }).on('error', (e) => {
            console.error(`Got error: ${e.message}`);
        });
    });
}

function getUsers() {
    return new Promise(resolve => {
        https.get(`https://slack.com/api/users.list?token=${token}&pretty=1`, (res) => {
            const {statusCode} = res;
            const contentType = res.headers['content-type'];

            let error;
            if (statusCode !== 200) {
                error = new Error('Request Failed.\n' + `Status Code: ${statusCode}`);
            } else if (!/^application\/json/.test(contentType)) {
                error = new Error('Invalid content-type.\n' + `Expected application/json but received ${contentType}`);
            }
            if (error) {
                console.error(error.message);
                // consume response data to free up memory
                res.resume();
                return;
            }

            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', (chunk) => {
                rawData += chunk;
            });
            res.on('end', () => {
                try {
                    users = JSON.parse(rawData).members;

                    fs.writeFile('./data/users.json', JSON.stringify(users), (err) => {
                        if (err) console.log(err);

                        console.log('> Successfully downloaded and wrote Users to users.json');
                        resolve();
                    });
                } catch (e) {
                    console.error(e.message);
                }
            });
        }).on('error', (e) => {
            console.error(`Got error: ${e.message}`);
        });
    });
}

function setUsersAndMessages() {
    return new Promise(resolve => {
        fs.readFile('./data/messages.json', 'utf-8', (err, data) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    return resolve(false);
                } else {
                    console.log(err);
                }
            }

            messages = JSON.parse(data);
            messages = messages.messages;

            fs.readFile('./data/users.json', 'utf-8', (err, data) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        return resolve(false);
                    } else {
                        console.log(err);
                    }
                }

                users = JSON.parse(data);
                users = users.members;

                resolve(true);
            });
        });
    });
}

function checkExistingFiles(exist) {
    return new Promise(resolve => {
        if(exist) {
            console.log('> Local files found, proceeding with local data');
            resolve();
        } else {
            console.log('> No local files found, retrieving data from Slack');
            createDirectory()
            .then(getMessages)
            .then(getUsers)
            .then(() => resolve());
        }
    });
}

function formatUsers() {
    return new Promise(resolve => {
        const newUsers = {};
        let idx = 0,
            id;

        users.forEach(user => {
            idx++;

            id = user.id;
            newUsers[id] = user;

            if(idx === users.length) {
                users = newUsers;
                resolve();
            }
        });
    });
}

function createHTML(messages) {
    return new Promise(resolve => {
        process.stdout.write('\n> Messages successfully parsed\n');

        const writeStream = fs.createWriteStream('./data/history.html', { encoding: 'utf8' });
        writeStream.write(`<!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <title>Slack Message History</title>
                <style media="screen">
                    body {
                        font-family: Arial, Helvetica, sans-serif;
                        font-size: 18px;
                        height: 100vh;
                        margin: 0;
                        padding: 0;
                        width: 100vw;
                    }

                    .container, .message, .content {
                        box-sizing: border-box;
                        display: flex;
                    }

                    .container {
                        flex-direction: column;
                        padding: 3% 5%;
                        width: 100%;
                    }

                    .message {
                        flex-direction: row;
                        padding-bottom: 30px;
                        width: 70%;
                    }

                    .avatar {
                        height: 60px;
                        width: 60px;
                    }

                    .content {
                        flex-direction: column;
                        padding-left: 20px;
                    }

                    .top {
                        padding-bottom: 5px;
                    }

                    a, .tag {
                        color: #0074D9;
                        text-decoration: underline;
                    }

                    .name {
                        font-weight: bold;
                    }

                    .time {
                        color: #777777;
                    }
                </style>
            </head>
            <body>
                <main class="container">
                    `);
        let index = 0;

        messages.forEach(message => {
            index++;

            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(`> Parsing HTML: ${index}`);

            let avatar = '';

            if(message.user.profile) {
                avatar = message.user.profile.image_72;
            }

            writeStream.write(`
                <article class="message">
                <img class="avatar" src="${avatar}" alt="${message.user.real_name}">
                <section class="content">
                    <header class="top">
                        <span class="name">${message.user.real_name || message.user.name}</span>&nbsp;&nbsp;<time class="time">${message.time}</time>
                    </header>
                    <main>
                        ${message.text}
                    </main>
                </section>
            </article>`);

            if (index === messages.length) {
                writeStream.write(`</main>
                    </body>
                </html>`);
                writeStream.end();

                process.stdout.write('\n');
                console.log('> HTML file successfully written to messageOutput.html');

                resolve();
            };
        });
    });
}

function createMessages() {
    return new Promise(resolve => {

        let index = 0;
        let finalMessages = [];

        messages.forEach(message => {
            index++;

            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(`> Parsing messages: ${index}`);

            let data = {
                message: message
            };

            Promise.resolve(data)
            .then(findUsername)
            .then(convertText)
            .then(convertTime)
            .then((data) => {
                finalMessages.push({
                    user: data.user,
                    text: data.text,
                    time: data.time
                });

                if (index === messages.length) {
                    resolve(finalMessages);
                };
            });
        });
    });
}

function findUsername(data) {
    return new Promise(resolve => {
        if(data.message.subtype === 'file_comment'){
            data.user = users[data.message.comment.user];
        } else if(data.message.subtype === 'bot_message'){
            data.user = createBotUser(data.message);
        } else {
            data.user = users[data.message.user];
        }

        if(!data.user) console.log(data.message);

        resolve(data);
    });
}

function createBotUser(message) {
    let image = message.icons ? message.icons.image_48 : '';

    return {
        id: message.bot_id,
        name: message.username,
        real_name: message.username,
        profile: {
            image_72: image
        }
    };
}

function convertTime(data) {
    return new Promise(resolve => {
        let time = Math.floor(+data.message.ts) * 1000;
        let date = new Date(time);
        data.time = date.toGMTString();
        resolve(data);
    });
}

function convertText(data) {
    return new Promise(resolve => {
        let text = data.message.text;
        let userTagRegex = /<@[^ ]+>/g,
            urlTagRegex = /<(http.*?:\/\/.*?)>/g;

        let message = {
            userTags: text.match(userTagRegex),
            urlTags: text.match(urlTagRegex),
            text: text
        };

        Promise.resolve(replaceUserTags(message))
        .then(replaceUrlTags)
        .then((message) => {
            data.text = message.text;
            resolve(data);
        });
    });
}

function replaceUserTags(message) {
    return new Promise(resolve => {
        if(!message.userTags) resolve(message);

        let tagFilterRegex = /[^<@>]+/g,
            index = 0;

        message.userTags.forEach(tag => {
            index++;

            let filteredTag = tag.match(tagFilterRegex)[0];
            let name = users[filteredTag].real_name || users[filteredTag].name;
            let htmlName = `<span class="tag">${name}</span>`;

            message.text = message.text.replace(tag, htmlName);

            if (index === message.userTags.length) resolve(message);
        });
    });
}

function replaceUrlTags(message) {
    return new Promise(resolve => {
        if(!message.urlTags) resolve(message);

        let index = 0;

        message.urlTags.forEach(tag => {
            index++;

            let filteredTag = tag.slice(1, -1);

            let link = filteredTag.split('|');

            let htmlLink = `<a href="${link[0]}" alt="${link[1] || ''}" target="_blank">${link[0]}</a>`;

            message.text = message.text.replace(tag, htmlLink);

            if (index === message.urlTags.length) resolve(message);
        });
    });
}

Promise.resolve(setUsersAndMessages())
.then(checkExistingFiles)
.then(formatUsers)
.then(createMessages)
.then(createHTML)
