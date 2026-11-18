# TODO

What is left, most useful first within each section.

## Remote view (web UI)

- The video output with the Desktop profile: the picture and the input were
  tested with a test pattern only, never with the KDE session.
- Minimal profile: put a text console on the video output, so there is
  something to see and type into.
- Wi-Fi panel: join a network from the page.
- Run on a laptop: a real terminal instead of one command at a time.
- A password for the page when it is shared with `--listen 0.0.0.0`.
- The power meter follows Flipper's emulator of it. Check against the
  firmware once it drives the meter (flipperone-mcu-firmware issue 254).

## Reliability

- CI: the Ubuntu boot often hangs before the kernel prints anything (empty
  console, 15-minute timeout). Two of the last three runs failed, with no
  change to the boot code between them. Find the cause; until then print
  QEMU and firmware versions and the boot screen in the failing run.
- Build the simulator modules from scratch through `f1emu sim on` on a clean
  machine. So far they were built by hand and put in the cache. Add it to CI.
- Never run: `--display gtk`, joining Wi-Fi from the device's own menu,
  recording from the microphone, `--open app`.
- Never tried: Fedora, an ARM64 host with KVM.
- The Router profile boots but its remote view and SSH do not answer.
- CI actions warn about an outdated Node.js runtime; update them.

## Simulated hardware

- Battery that drains and charges over time, following the power flow,
  instead of staying where it is set.
- Wi-Fi signal strengths that differ per network. All are 100% now.
- Modem: the RSRP line shows `lte` instead of a number. No data flows
  through the modem; give it a real link like the laptops have.
- GPIO: check whether the kernel's `gpio-sim` can be built the same way as
  the other simulators, and show the pins in the page.
- Real USB devices from the PC (a Wi-Fi stick, a serial adapter) over
  USB/IP. Needs root on the PC and one package in the guest.
- Sub-GHz, LoRa and the other radios: nothing in the OS shows them yet, so
  there is nothing to drive. Revisit when Flipper ships that software.

## Automation and AI agents

- `--json` on every command.
- "What is on screen" as text, from flipctl's own log, so a script does not
  have to read a picture.
- `wait` commands: until the screen changes, until an app has started.
- A test runner: start from a snapshot, add an app, press keys, collect the
  screen and the app's log, throw the instance away.
- An MCP server on top of those commands.
- Point the same commands at a real Flipper One on the network. Its remote
  view is the same web server, so most of them should work unchanged.

## Project

- Keep `~/Files` and installed apps when moving an instance to a newer build.
- Shell completion.
- AUR package.
- Device colour themes in the page.
- Link to wasabicover258/Flipper-Emulator for Windows and Flipper Zero, once
  that is agreed with its author.
