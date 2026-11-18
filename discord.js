delete window.$;
let wpRequire = webpackChunkdiscord_app.push([[Symbol()], {}, function(r){ return r; }]);
webpackChunkdiscord_app.pop();

let ApplicationStreamingStore = Object.values(wpRequire.c).find(x => x?.exports?.A?.__proto__?.getStreamerActiveStreamMetadata)?.exports?.A;
let RunningGameStore = Object.values(wpRequire.c).find(x => x?.exports?.Ay?.getRunningGames)?.exports?.Ay;
let QuestsStore = Object.values(wpRequire.c).find(x => x?.exports?.A?.__proto__?.getQuest)?.exports?.A;
let ChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.A?.__proto__?.getAllThreadsForParent)?.exports?.A;
let GuildChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.default?.getSFWDefaultChannel && x?.exports?.default?.getAllGuilds)?.exports?.default;
let FluxDispatcher = Object.values(wpRequire.c).find(x => x?.exports?.h?.__proto__?.flushWaitQueue)?.exports?.h;
let api = Object.values(wpRequire.c).find(x => x?.exports?.Bo?.get)?.exports?.Bo;
let QuestActions = Object.values(wpRequire.c).find(x => x?.exports?.Oy && x?.exports?.R2 && x?.exports?.N1)?.exports;

const supportedTasks = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"];
const isActive = x => !x.userStatus?.completedAt && new Date(x.config.expiresAt).getTime() > Date.now();
const hasSupported = x => !!supportedTasks.find(y => Object.keys((x.config.taskConfig ?? x.config.taskConfigV2).tasks).includes(y));

const activeGames = new Map();
const activeStreams = new Map();
let gameSpoofOn = false, streamSpoofOn = false;
let hiddenRealGames = [], realGetRunningGames, realGetGameForPID, realStreamFunc;

function installGameSpoof() {
    if (gameSpoofOn) return;
    gameSpoofOn = true;
    hiddenRealGames = RunningGameStore.getRunningGames();
    realGetRunningGames = RunningGameStore.getRunningGames;
    realGetGameForPID = RunningGameStore.getGameForPID;
    RunningGameStore.getRunningGames = () => [...activeGames.values()];
    RunningGameStore.getGameForPID = p => [...activeGames.values()].find(x => x.pid === p);
}
function releaseGameSpoof() {
    if (!gameSpoofOn || activeGames.size) return;
    gameSpoofOn = false;
    RunningGameStore.getRunningGames = realGetRunningGames;
    RunningGameStore.getGameForPID = realGetGameForPID;
    FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [], added: hiddenRealGames, games: hiddenRealGames });
}
function installStreamSpoof() {
    if (streamSpoofOn) return;
    streamSpoofOn = true;
    realStreamFunc = ApplicationStreamingStore.getStreamerActiveStreamMetadata;
    ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => activeStreams.values().next().value;
}
function releaseStreamSpoof() {
    if (!streamSpoofOn || activeStreams.size) return;
    streamSpoofOn = false;
    ApplicationStreamingStore.getStreamerActiveStreamMetadata = realStreamFunc;
}
function progressOfQuest(quest, taskName) {
    const q = QuestsStore.quests.get(quest.id);
    if (!q) return 0;
    return q.config.configVersion === 1
        ? Math.floor(q.userStatus?.streamProgressSeconds ?? 0)
        : Math.floor(q.userStatus?.progress?.[taskName]?.value ?? 0);
}

(async () => {
    // ---- AUTO-ACCEPT ----
    const enrollable = [...QuestsStore.quests.values()].filter(x => !x.userStatus?.enrolledAt && isActive(x));
    if (enrollable.length) {
        console.log(`Auto-accepting ${enrollable.length} quest(s)...`);
        const results = await Promise.allSettled(enrollable.map(q => QuestActions.Oy(q.id, { questContent: 11 })));
        enrollable.forEach((q, i) => {
            const ok = results[i].status === "fulfilled" && results[i].value?.type === "success";
            console.log(`  [${ok ? "OK" : "FAIL"}] ${q.config.messages?.questName}`);
        });
    }

    const quests = [...QuestsStore.quests.values()].filter(x => x.userStatus?.enrolledAt && isActive(x) && hasSupported(x));
    if (quests.length === 0) { console.log("No farmable quests."); return; }

    const runQuest = async (quest) => {
        const questName = quest.config.messages.questName;
        const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
        const taskName = supportedTasks.find(x => taskConfig.tasks[x] != null);
        const taskData = taskConfig.tasks[taskName];
        const applicationId = quest.config.application?.id ?? taskData.applications?.[0]?.id;
        const secondsNeeded = taskData.target;

        if (taskName === "WATCH_VIDEO" || taskName === "WATCH_VIDEO_ON_MOBILE") {
            const enrolledAt = new Date(QuestsStore.quests.get(quest.id)?.userStatus?.enrolledAt ?? Date.now()).getTime();
            const isVideoComplete = res => res.body?.completed_at != null
                || (res.body?.progress?.[taskName]?.value ?? 0) >= secondsNeeded;
            let completed = false;
            while (true) {
                const elapsed = Math.floor((Date.now() - enrolledAt) / 1000);
                const ts = Math.min(secondsNeeded, Math.max(0, elapsed));
                let res;
                try {
                    res = await api.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: ts } });
                } catch (e) {
                    await new Promise(r => setTimeout(r, 3000));
                    continue;
                }
                const value = res.body?.progress?.[taskName]?.value ?? 0;
                console.log(`[${questName}] progress: ${value}/${secondsNeeded}`);
                if (isVideoComplete(res)) { completed = true; break; }
                if (ts >= secondsNeeded) break;
                await new Promise(r => setTimeout(r, Math.max(2000, (secondsNeeded - elapsed) * 1000)));
            }
            if (!completed) {
                const res = await api.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: secondsNeeded } });
                if (!isVideoComplete(res)) throw new Error("Video completion was not confirmed by Discord");
            }
            console.log(`[${questName}] Quest completed!`);
        } else if (taskName === "PLAY_ON_DESKTOP") {
            const res = await api.get({ url: `/applications/public?application_ids=${applicationId}` });
            const appData = res.body[0];
            const execRel = appData.executables?.find(x => x.os === "win32")?.name?.replace(/>/g, "");
            const exeName = execRel ? execRel.split(/[\\/]/).pop() : appData.name.replace(/[\/\\:*?"<>|]/g, "") + ".exe";
            const exePathRel = execRel || (appData.name.replace(/[\/\\:*?"<>|]/g, "") + "/" + exeName);

            let fakeGame = {
                cmdLine: "C:\\Program Files\\" + exePathRel.replace(/\//g, "\\"),
                exeName,
                exePath: "c:/program files/" + exePathRel,
                hidden: false, isLauncher: false,
                id: applicationId, name: appData.name,
                pid: Math.floor(Math.random() * 30000) + 1000,
                pidPath: [], processName: appData.name, start: Date.now(),
            };
            fakeGame.pidPath = [fakeGame.pid];

            const spawnGame = () => {
                fakeGame.pid = Math.floor(Math.random() * 30000) + 1000;
                fakeGame.pidPath = [fakeGame.pid];
                fakeGame.start = Date.now();
                activeGames.set(quest.id, fakeGame);
                const isFirst = !gameSpoofOn;
                installGameSpoof();
                FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: isFirst ? hiddenRealGames : [], added: [fakeGame], games: [...activeGames.values()] });
            };
            spawnGame();
            console.log(`Spoofed your game to ${appData.name}.`);

            await new Promise(resolve => {
                let lastProgress = -1, stalled = 0;
                const fn = () => {
                    const progress = progressOfQuest(quest, "PLAY_ON_DESKTOP");
                    console.log(`[${questName}] Quest progress: ${progress}/${secondsNeeded}`);
                    if (progress >= secondsNeeded) {
                        console.log(`[${questName}] Quest completed!`);
                        activeGames.delete(quest.id);
                        FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: [...activeGames.values()] });
                        releaseGameSpoof();
                        FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                        resolve(); return;
                    }
                    if (progress === lastProgress) {
                        stalled++;
                        if (stalled >= 6) {
                            stalled = 0; lastProgress = -1;
                            activeGames.delete(quest.id);
                            FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: [...activeGames.values()] });
                            spawnGame();
                        }
                    } else { stalled = 0; lastProgress = progress; }
                };
                FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
            });
        } else if (taskName === "STREAM_ON_DESKTOP") {
            const spawnStream = () => {
                activeStreams.set(quest.id, { id: applicationId, pid: Math.floor(Math.random() * 30000) + 1000, sourceName: null });
                installStreamSpoof();
            };
            spawnStream();
            console.log(`Spoofed your stream to ${questName}. Stream any window in vc.`);

            await new Promise(resolve => {
                let lastProgress = -1, stalled = 0;
                const fn = () => {
                    const progress = progressOfQuest(quest, "STREAM_ON_DESKTOP");
                    console.log(`[${questName}] Quest progress: ${progress}/${secondsNeeded}`);
                    if (progress >= secondsNeeded) {
                        console.log(`[${questName}] Quest completed!`);
                        activeStreams.delete(quest.id);
                        releaseStreamSpoof();
                        FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                        resolve(); return;
                    }
                    if (progress === lastProgress) { stalled++; if (stalled >= 6) { stalled = 0; lastProgress = -1; activeStreams.delete(quest.id); spawnStream(); } }
                    else { stalled = 0; lastProgress = progress; }
                };
                FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
            });
        } else if (taskName === "PLAY_ACTIVITY") {
            const dmId = ChannelStore.getSortedPrivateChannels?.()?.[0]?.id;
            const voiceChannel = Object.values(GuildChannelStore.getAllGuilds())
                .find(x => x != null && (x.VOCAL?.length ?? 0) > 0)?.VOCAL?.[0]?.channel?.id;
            const channelId = dmId ?? voiceChannel;
            if (!channelId) throw new Error("PLAY_ACTIVITY butuh DM/voice channel");
            const streamKey = `call:${channelId}:1`;
            let lastProgress = -1, stalled = 0;
            while (true) {
                const res = await api.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: false } });
                const progress = res.body.progress?.PLAY_ACTIVITY?.value ?? 0;
                console.log(`[${questName}] Quest progress: ${progress}/${secondsNeeded}`);
                if (progress === lastProgress) { stalled++; if (stalled >= 3) throw new Error("heartbeat mandek"); } else { stalled = 0; lastProgress = progress; }
                await new Promise(r => setTimeout(r, 20000));
                if (progress >= secondsNeeded) {
                    await api.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: true } });
                    console.log(`[${questName}] Quest completed!`);
                    break;
                }
            }
        }
    };

    Promise.all(quests.map(q => runQuest(q).catch(e => console.log("Quest failed:", q.config.messages.questName, e)))).then(() => console.log("All jobs done."));
})();