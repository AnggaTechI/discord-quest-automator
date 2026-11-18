const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '..', 'discord.js'), 'utf8');

async function runVideo(taskName, responses) {
    const logs = [];
    const requests = [];
    let finish;
    const finished = new Promise(resolve => { finish = resolve; });
    const quest = {
        id: 'test-quest',
        config: {
            configVersion: 2,
            expiresAt: new Date(Date.now() + 60000).toISOString(),
            messages: { questName: 'Test video' },
            taskConfig: { tasks: { [taskName]: { target: 10 } } },
        },
        userStatus: { enrolledAt: new Date(Date.now() - 60000).toISOString() },
    };
    const withMethod = (name, properties = {}) => Object.assign(
        Object.create({ [name]() {} }), properties,
    );
    const api = {
        async get() { throw new Error('Unexpected GET request'); },
        async post(request) {
            requests.push(request);
            const response = responses[requests.length - 1];
            if (response instanceof Error) throw response;
            assert.notEqual(response, undefined, 'Unexpected extra request');
            return response;
        },
    };
    const exports = [
        { A: withMethod('getStreamerActiveStreamMetadata') },
        { Ay: { getRunningGames: () => [] } },
        { A: withMethod('getQuest', { quests: new Map([[quest.id, quest]]) }) },
        { A: withMethod('getAllThreadsForParent') },
        { default: { getSFWDefaultChannel() {}, getAllGuilds: () => ({}) } },
        { h: withMethod('flushWaitQueue') },
        { Bo: api },
        { Oy() {}, R2() {}, N1() {} },
    ];
    const cache = exports.map(value => ({ exports: value }));
    const startup = vm.runInNewContext(source, {
        window: {},
        webpackChunkdiscord_app: {
            push(chunk) { return chunk[2]({ c: cache }); },
            pop() {},
        },
        console: {
            log(...args) {
                logs.push(args.map(String).join(' '));
                if (args[0] === 'All jobs done.') finish();
            },
        },
        setTimeout,
    });
    await startup;
    await finished;
    return { logs, requests };
}

for (const taskName of ['WATCH_VIDEO', 'WATCH_VIDEO_ON_MOBILE']) {
    const progress = value => ({ body: { progress: { [taskName]: { value } } } });
    const cases = [
        ['accepts confirmed progress', [progress(10)], true],
        ['accepts an explicit completion timestamp', [{ body: { completed_at: '2026-01-01T00:00:00Z' } }], true],
        ['checks the final response', [progress(5), progress(10)], true],
        ['rejects missing server confirmation', [{ body: {} }, { body: {} }], false],
        ['reports a failed final request', [progress(5), new Error('Request failed')], false],
        ['rejects incomplete final progress', [progress(5), progress(6)], false],
    ];
    for (const [name, responses, completed] of cases) {
        test(`${taskName}: ${name}`, { timeout: 2000 }, async () => {
            const { logs, requests } = await runVideo(taskName, responses);
            assert.equal(logs.some(line => line.includes('Quest completed!')), completed, logs.join('\n'));
            assert.equal(logs.some(line => line.startsWith('Quest failed:')), !completed, logs.join('\n'));
            assert.equal(requests.length, responses.length);
            assert.ok(requests.every(request => request.url === '/quests/test-quest/video-progress'));
        });
    }
}
