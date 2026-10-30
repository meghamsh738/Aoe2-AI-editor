# Your first AI Workshop game test

Start with **Britons**, then repeat with **Portuguese**. This package is for your official Steam version of **Age of Empires II: Definitive Edition on Mac**. The game is on your external drive; its user AI folder is on the Mac.

The files have been checked outside the game. We are now checking whether your game can load and run them. You do not need to change any code.

## 1. Install the six AI files

1. Keep the external drive connected. Save any open game and quit AoE II normally.
2. Unzip **AI-Workshop-First-Test.zip**. Open the extracted **AI-Workshop-First-Test** folder, then open **AI**. It contains six files: three matching `.ai` / `.per` pairs. The empty `.ai` files are intentional; keep both files in each pair.
3. In Finder, press **Shift–Command–G** and paste:

   `~/Library/Application Support/Feral Interactive/Age Of Empires II/VFS/User/Games/Age of Empires 2 DE/`

4. Open the **long numbered folder**, then **resources → _common → ai**. On the inspected Mac there is one long numbered Steam profile plus a folder named `0`. Use the long numbered profile. If you see multiple long numbered folders, stop and send a screenshot of the folder names so we can identify the correct profile.
5. Copy the **six files inside AI** into that `ai` folder. Do not copy the enclosing AI folder, project JSON or README. The names include `2026-10-30` to avoid your other bots. If Finder asks to replace anything, choose **Cancel** and tell me; do not overwrite it.
6. Reopen AoE II through Steam.

This user AI folder exists in your installed Mac game's files. Its recognition by the Mac game is the first test; it has not yet been demonstrated. If the bots do not appear, use the troubleshooting steps below rather than copying files into additional locations.

## 2. Start the Britons test

If you have never played this installation, first run an ordinary single-player match for 15 minutes, save it and reload it. This separates a game-installation problem from a custom-AI problem.

Open **Single Player → Skirmish**. Use two player slots:

| Slot | Who plays | Civilization | Team |
|---|---|---|---|
| 1 | You | Britons | 1 |
| 2 | **Workshop Test Britons 2026-10-30** | **Britons** | 2 |

In slot 2, open the opponent's name/AI selector and choose the named Workshop AI from the custom-AI list. Selecting the ordinary built-in `AI` does not test this file. If the selector looks different, send a screenshot of the setup screen.

Use these settings; take a screenshot before starting so you can restore your usual choices afterward:

| Setting | Value |
|---|---|
| Game mode | Random Map |
| Map | Arabia |
| Map size | Tiny / 2 players |
| Difficulty | Extreme (keeps the test settings consistent) |
| Resources | Standard |
| Starting age | Dark Age |
| Ending age, if shown | Imperial Age |
| Population | 200 |
| Game speed | Normal |
| Victory | Conquest |
| Reveal map | Normal |
| Teams | Opposing teams; Lock Teams on |
| Full Tech Tree / cheats | Off |
| Record game | On |

Keep this a normal single-player game. For the first 20 in-game minutes, build your own town and avoid attacking the bot. Scout normally if you want to see its base; do not use reveal-map cheats. Keep your town alive if the bot attacks.

**First signs to look for:** the match opens without a script error; the bot gathers, adds villagers and buildings, advances ages, and begins making archers. These are the intended actions, not a promise of what the untested script will do. There is no fixed age-up time to beat.

At about **10 and 20 in-game minutes**, note what you can see. Save the game at 20 minutes. If the bot is progressing, you can continue to Castle/Imperial and save again. If it is stuck, that result is useful too—do not spend an hour waiting. Keep the recorded game so we can inspect its economy even if fog hid it from you.

## 3. Repeat with Portuguese

Start a **new** match with the same settings. Change slot 2 to **Workshop Test Portuguese 2026-10-30** and its civilization to **Portuguese**. Your own civilization can stay Britons.

Look for gathering and age advancement, then a Castle and Organ Guns after reaching Castle Age. Save at 20 minutes, or when something fails. If progress continues, record later age changes and army growth. Imperial is the final game age; the editor's post-Imperial phase is later development within it.

Do not test raids, destroyed Castles or the full five-seed matrix yet. These first two matches tell us whether loading and ordinary development work.

## If something goes wrong

- **AI absent from the list:** check that all six files are directly in the `ai` folder, have not gained `.txt` extensions, and that the game was restarted. Send the Finder folder path/file list and the opponent selector. This is a discovery problem, not proof that the bot logic failed.
- **Error mentions a script or line number:** take a screenshot of the entire error before dismissing it. Record the bot name and game version. Stop that match.
- **Match loads but the bot is idle or stuck:** save it and note the game time. Send the save/recording and a screenshot if possible. Do not change its difficulty or files mid-test.
- **Game crashes:** record whether the ordinary built-in AI also crashes. Keep any displayed error and the last save; do not repeatedly retry the same crash.

### Optional: tiny load test

Use this only to diagnose a full bot's load failure. In a new match with the same settings, choose **Workshop Test Load 2026-10-30** as slot 2 (any civilization). Let it run for about one in-game minute, then exit normally.

This file contains one simple rule. It sends `Workshop: load probe started.` to its **own local chat** once and then stops that rule. It is not a playable bot and is not expected to build an economy. The message may not be visible from your player's view. Report whether it appeared in the selector, whether the match opened, any script errors, and whether you could see the message. Do not call silence a confirmed pass.

If the tiny probe loads but a full bot reports a script error, we can investigate that script. If none of the custom names appear, we need to resolve the installation location first.

## Send back these results

Use **RESULTS.txt**, or simply send:

1. A screenshot of the game's version number and the match setup.
2. For each bot: did its name appear, did the match start, and what happened by 10/20 minutes?
3. Any complete error screenshot, plus a save or recorded game. Tell me which bot and game time it belongs to. A loss is not automatically an AI failure.

Keep saves/recordings through the game's own menus. If you cannot find them afterward, tell me rather than moving or deleting folders. Keep the extracted package for its matching editable projects and error-reference files.

To remove this test later, quit the game and remove only the six dated Workshop files you copied. Keep the originals in this package and preserve any saves/recordings. Do not remove other AI files or settings.

## Package notes

Both playable scripts come from readiness source `8caa310`. Only their names have changed for this test; their rules and preset settings are unchanged. `Projects` contains the editable version-2 projects; `Diagnostics` contains rule-to-editor maps; `MANIFEST.json` identifies and hashes the files. None of those support files goes into the game's `ai` folder.

The inspected Steam installation is on `/Volumes/Coding Projects/SteamLibrary`; Steam's content build ID was `25464371` on 30 October 2026. That is not the in-game version number—please record the version shown by AoE II. The user AI path above was found on this Mac; official documentation does not establish that exact Mac path. The Windows kit and wider game-acceptance matrix remain separate; these first Mac tests do not verify Windows.

References: [official Skirmish guide](https://www.ageofempires.com/learn-to-play/civilizations-game-modes-aoe2/), [official update noting automatically created external-AI folders](https://www.ageofempires.com/news/age-of-empires-ii-definitive-edition-update-185872/), [Feral Mac mod FAQ](https://www.feralinteractive.com/en/support/mac/ageofempires2/#faqs/mods_steam). The installed `AgeOfEmpires2Data/Docs/All/TC CP Strategy Builder.doc` explains the matching empty `.ai` and script `.per` pair. Feral's FAQ documents subscribed mods, not this exact local path; the first manual run supplies the missing game evidence.
