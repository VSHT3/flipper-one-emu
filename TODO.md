# TODO

What is left, most useful first within each section.

## Remote view (web UI)

Today the page can press buttons, plug cables by clicking them, and set the
battery level and 5G signal. Everything else below needs a terminal and
should not.

- Favicon for the page.
- Capture button: record the simulated Wi-Fi air for N seconds and download
  the `.pcap`.
- Laptop panel: show each plugged-in laptop's address and run a command on it
  (or a small terminal), instead of `f1emu sim laptop run`.
- Modem controls: operator name and LTE/5G next to the signal slider.
- Wi-Fi panel: list the simulated networks with their passwords.
- USB-C1 chooser: pick charger, phone or laptop from a small menu. Cycling
  through them by repeated clicks is hard to discover.
- Screenshot button.
- Snapshot, factory reset and shut down buttons.
- A way to start the video output from the page and see it there, not in a
  separate QEMU window.
- The two Ethernet cables sag by different amounts and cross each other.
  Give them the same curve.
- The HDMI cable has never been looked at on the device.
- Re-check by clicking that cables no longer jump back out while a click is
  being carried out. The cause is fixed, the result was not re-tested.
- Two guesses to replace with facts: how many watts one power meter segment
  stands for (3 W assumed), and what the LINK light means (green when the
  internet is reachable).

## Reliability

- CI: the Ubuntu boot often hangs before the kernel prints anything (empty
  console, 15-minute timeout). Two of the last three runs failed, with no
  change to the boot code between them. Find the cause; until then print
  QEMU and firmware versions and the boot screen in the failing run.
- Build the simulator modules from scratch through `f1emu sim on` on a clean
  machine. So far they were built by hand and put in the cache. Add it to CI.
- Never run: `--display gtk`, using the `--video` window with mouse and
  keyboard, joining Wi-Fi from the device's own menu, recording from the
  microphone, `--open app`.
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
