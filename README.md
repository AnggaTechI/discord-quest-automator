<a name="top"></a>

<p align="center">
  <img src="./assets/hero.gif" width="1000" alt="Quest Runner — animated banner with orbiting lights and rotating status text">
</p>

<div align="center">

**One file. Five task types. Progress right in your console.**

<img src="./assets/badges.svg" width="620" alt="JavaScript · 5 task types · 1 console script">

<br><br>

[ Features ](#features) &nbsp; / &nbsp; [ Tasks ](#tasks) &nbsp; / &nbsp; [ Quick start ](#quick-start) &nbsp; / &nbsp; [ Console ](#console) &nbsp; / &nbsp; [ FAQ ](#faq)

</div>

<br>

Quest Runner automates Discord Quest enrollment and progress from the client console. Video and activity tasks use progress requests; game and stream tasks simulate activity through Discord's internal modules.

Open [`discord.js`](./discord.js), read the code, and run it from the console. Claim rewards yourself from the Quests page once they're available.

## Features

| | Feature | What it does |
| :---: | :--- | :--- |
| **01** | **Auto-accept** | Attempts to enroll in every active quest you haven't joined yet. Each attempt logs `[OK]` or `[FAIL]`. |
| **02** | **Parallel jobs** | Starts multiple quests together, with progress logs labeled by quest name. |
| **03** | **Video progress** | Sends timestamps based on time elapsed since enrollment and retries failed requests. |
| **04** | **Game spoofing** | Creates virtual game process data and dispatches activity updates to the running game store. |
| **05** | **Stream spoofing** | Overrides the application metadata for your stream. You still need to start screen sharing yourself. |
| **06** | **Activity heartbeat** | Sends periodic heartbeats using a DM or voice channel found on your account. |
| **07** | **Stall recovery** | Recreates game or stream activity after six consecutive heartbeat events with no progress change. |
| **08** | **Progress logging** | Reports progress in seconds, completion messages, and errors for each quest. |
| **09** | **Store restoration** | Restores game or stream functions once all related tasks are detected as complete. Errors during execution can prevent cleanup. |

## Tasks

<p align="center">
  <img src="./assets/tasks.gif" width="1000" alt="Animated cards for five task types: video, mobile video, game, stream, and activity">
</p>

| Task ID | How it works | What you need |
| :--- | :--- | :--- |
| `WATCH_VIDEO` | Sends video progress updates. | A video quest available on your account. |
| `WATCH_VIDEO_ON_MOBILE` | Uses the same video progress request flow. | Compatibility depends on the quest and client; support for every mobile quest is not guaranteed. |
| `PLAY_ON_DESKTOP` | Simulates a running process for the quest's application. | The desktop client. Executable paths in the script use Windows formatting. |
| `STREAM_ON_DESKTOP` | Simulates the streamed application's metadata. | An active screen share in a voice channel and any other conditions the quest requires. |
| `PLAY_ACTIVITY` | Sends a heartbeat roughly every 20 seconds. | A DM or voice channel the script can find. |

If a quest offers several supported tasks, the script picks one based on the order of `supportedTasks` in the code.

## Quick start

You'll need **Discord desktop on Windows**, a signed-in account, an active quest, and access to **Developer Tools**.

1. Open [`discord.js`](./discord.js) and review the code.
2. In Discord, open **Developer Tools → Console**.
3. Paste the entire script and press **Enter**.
4. Watch the progress logs. For stream tasks, start screen sharing in a voice channel.
5. Check the final status on the **Quests** page and claim any available rewards.

> Running the script immediately attempts to enroll in **all active quests you haven't joined**, including quests with unsupported task types. There is no quest picker or extra confirmation step.

No dependencies to install. This script runs inside the Discord client; it won't work by running `node discord.js`.

## Console

<p align="center">
  <img src="./assets/console.gif" width="1000" alt="Illustrative console animation showing enrollment, progress for two quests, and completion messages">
</p>

<p align="center"><sub>Illustrative demo with sample names and progress values. Not a recording of a test run.</sub></p>

| Message | Meaning |
| :--- | :--- |
| `Auto-accepting ... quest(s)...` | The script is attempting to enroll in quests. |
| `No farmable quests.` | No enrolled, unexpired, incomplete quests with supported tasks were found when checked. |
| `Spoofed your game to ...` | Virtual game activity data has been installed. |
| `Quest progress: .../...` | Progress read from the store or server response. |
| `Quest completed!` | The task handler considers the task complete. Confirm its status in Discord. |
| `Quest failed:` | That quest's handler encountered an error. |
| `All jobs done.` | All jobs have ended; some may have ended with errors. |

### Stopping or running again

**Reload Discord, or close and reopen the client.** This stops execution and reloads the client functions the script modified.

Run it once per session. Pasting it again without reloading can leave multiple timers and listeners active.

## FAQ

<details>
<summary><b>Why isn't my stream quest progressing?</b></summary>

<br>

You still need to start screen sharing and meet the quest's requirements. The script only changes the stream's application metadata.

Stream quests also share one metadata function, which returns the first active stream entry. Running several stream quests together does not guarantee progress for all of them.

</details>

<details>
<summary><b>What happens if progress stalls?</b></summary>

<br>

- **Game / stream:** recreates activity after six consecutive heartbeat events without a progress change.
- **Video:** waits three seconds before retrying a failed request. There is no retry limit.
- **Activity:** exits with an error after three consecutive heartbeats without a progress change.

If progress stays stuck, reload the client before trying again.

</details>

<details>
<summary><b>It says “completed.” Where's my reward?</b></summary>

<br>

Check the Quests page. Console messages may not reflect the final server status, and the script does not claim rewards automatically.

</details>

<details>
<summary><b>Why did it break after a Discord update?</b></summary>

<br>

The script relies on internal Webpack modules, stores, export names, and endpoints. Client changes can break module lookups or requests. Having handlers for five task types does not guarantee that every quest will work.

</details>

<details>
<summary><b>Do I need to upload the animation files too?</b></summary>

<br>

Yes. Upload the `assets/` folder alongside `README.md` and `discord.js`, keeping this layout:

```text
.
├── README.md
├── discord.js
└── assets/
    ├── hero.gif
    ├── tasks.gif
    ├── console.gif
    └── badges.svg
```

All animations are included as local repository files. Image links use relative paths, following [GitHub's guidance](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#relative-links).

</details>

<br>

---

<div align="center">

**ACCEPT. RUN. REPEAT.**

<sub>Unofficial project. Not affiliated with Discord.</sub><br>
<sub><code>discord.js</code> here is the script, not the npm package with the same name.</sub>

<br><br>

[ ↑ Back to top ](#top)

</div>
