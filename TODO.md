# TODO

What is left, most useful first within each section.

## Remote view (web UI)

- The video output with the Desktop profile: the picture and the input were
  tested with a test pattern only, never with the KDE session.
- Minimal profile: put a text console on the video output, so there is
  something to see and type into.
- Wi-Fi panel: join a network from the page, and show each network's strength.
- Run on a laptop: a real terminal instead of one command at a time.
- A password for the page when it is shared with `--listen 0.0.0.0`.
- The power meter follows Flipper's emulator of it. Check against the
  firmware once it drives the meter (flipperone-mcu-firmware issue 254).
- Device colour themes in the page. Open question: which colours, and of
  what, the page or the device in the photo.

## Reliability

- The CI hang is worked around, not understood: QEMU 8.2 gets the CPU model
  `cortex-a72` instead of `max`. Which feature of `max` stops this kernel was
  not isolated, and QEMU 9 and 10 were never tried; they get `cortex-a72`
  too, which boots about ten seconds slower than `max` does on QEMU 11.
- The `simulators` CI job (builds the modules inside the runner's emulated
  guest) has never run. It may need longer than the hour `sim on` allows.
- Never run: `--display gtk`, `--open app`. Both open a window.
- The microphone: the guest records from the PC's source, but the only
  source at hand was a silent one. Nobody has heard it work.
- Never tried: Fedora, an ARM64 host with KVM, a browser other than the one
  used for testing.
- Router profile: its LAN bridge has no ports here. Give it a second network
  card as `end1`, so a laptop can sit behind the router.

## Simulated hardware

- Modem: the RSRP line shows `lte` instead of a number. The stand-in prints
  what `qmicli` prints, so this is probably flipctl's reading of it; compare
  with a real modem, or report it to Flipper.
- GPIO: `gpio-sim` cannot be loaded into Flipper's kernel (it needs the
  interrupt simulator, built in or not at all). Ask Flipper to turn on
  `CONFIG_GPIO_SIM`, or boot a kernel built here.
- Real USB devices from the PC (a Wi-Fi stick, a serial adapter) over
  USB/IP. The guest's kernel has the modules; the PC side needs root.
- An empty battery only reads 0%. The real device would shut down.
- Sub-GHz, LoRa and the other radios: nothing in the OS shows them yet, so
  there is nothing to drive. Revisit when Flipper ships that software.

## Automation and AI agents

- `screen` knows the screen's name, not its words: flipctl does not log
  them. Ask Flipper for that, or read the panel's pixels with its font.
- `--device`: try it on a real Flipper One.
- `mcp`: try it with an agent; so far only by hand.
- `test`: a file of steps (keys, waits, expected screens) instead of flags.

## Project

- AUR: `packaging/aur/PKGBUILD` builds; publish it.
- `upgrade` was run once, from build 2494 to 2495.
- Link to wasabicover258/Flipper-Emulator for Windows and Flipper Zero, once
  that is agreed with its author.
