# f1emu

Runs Flipper One OS on a Linux PC in QEMU. No root.

It downloads an official Flipper OS image, reads the kernel out of it, boots
it and opens the device's remote view in a browser. The OS, menus, App
Manager and apps come from the image unmodified; only the hardware is
emulated.

Unofficial, not affiliated with Flipper Devices. This repository contains no
Flipper software; images are downloaded from `dl-linux-images.flipp.dev`.

## Requirements

`qemu-system-aarch64`, AArch64 UEFI firmware (EDK2), `qemu-img`, `zstd`,
`btrfs-progs`, `ssh`, Python 3.11+. About 10 GB of free disk. Optional:
`pactl` (PipeWire or PulseAudio) for sound, `sshfs` for the shared folder.

| Distro | Install |
|---|---|
| Arch | `pacman -S qemu-system-aarch64 qemu-img zstd btrfs-progs openssh` |
| Debian/Ubuntu | `apt install qemu-system-arm qemu-efi-aarch64 qemu-utils zstd btrfs-progs openssh-client` |
| Fedora | `dnf install qemu-system-aarch64 edk2-aarch64 qemu-img zstd btrfs-progs openssh-clients` |

The Arch line is what this was developed on; CI boots the newest build on
Ubuntu 24.04. Fedora is untested. `f1emu doctor` reports what is missing.

## Use

```
f1emu start                  # first run downloads the newest build (2 GB)
f1emu stop
f1emu status
```

The remote view is at `http://127.0.0.1:8899/`. Click the buttons on the
picture or use the keyboard: arrows, Enter, Backspace, Tab, `z x c v b`, `a`.
The column on its right holds what the emulator adds: the simulated
hardware, the video output, screenshots, snapshots, factory reset and shut
down. It runs commands in the guest for whoever can open the page, so think
before sharing it with `--listen 0.0.0.0`.

| Command | What it does |
|---|---|
| `start` | Boot. Options: `--build`, `--variant`, `--profile`, `--kernel`, `-m`, `-c`, `-p`, `--ssh-port`, `--listen`, `--forward`, `--no-network`, `--no-audio`, `--mic`, `--sim`, `--video`, `--disk-size`, `--ephemeral`, `--open browser\|app\|none`, `--display gtk`, `--append`, `--qemu-arg`, `-n NAME` |
| `stop [--force] [--all]` | Clean shutdown, or kill |
| `restart [--reset]` | Stop and start again with the options of the last start; `--reset` erases the disk in between |
| `ssh [--root] [-- CMD]` | Shell in the guest (`user` has passwordless sudo) |
| `push` / `pull` | Copy files in and out (`push` defaults to `~/Files/`) |
| `mount DIR [GUEST_DIR]` / `umount` | Show the device's `~/Files` (or another folder) as a folder on the PC |
| `audio on\|off [--mic]` | Connect the guest's sound, and optionally the PC microphone, while it runs |
| `apps list\|install\|run\|remove` | The device's App Manager from the terminal |
| `apps add FILE` | Copy your own `.fap.AppImage` or `.fap.py` into the device's app list |
| `sim on [wifi battery modem laptop video]` | Load pretend hardware (see below); `sim status` shows it |
| `sim battery [LEVEL] [--speed N]`, `sim usb none\|charger\|device\|laptop` | Set the battery, how fast it empties and fills, and what is plugged into USB-C1 |
| `sim modem --signal N --operator NAME --tech lte\|5gnr` | Set what the 5G modem screen reports |
| `sim laptop on\|off\|run CMD` | A pretend laptop on ETH1 that gets its internet from the Flipper |
| `sim pcap FILE [--seconds N]` | Capture the simulated Wi-Fi air, WPA2 handshakes included |
| `press KEY...` | Press device buttons |
| `screenshot FILE [--scale N] [--grey] [--vt] [--video]` | Save the panel (or the boot console, or the video output) as PNG |
| `log [-f] [--journal]` | Boot console or systemd journal |
| `snapshot save\|load\|delete\|list` | Snapshots. Of a stopped instance, its disk. Of a running one, disk and memory: `load` goes back to that moment without a boot |
| `reset` | Factory reset one instance |
| `upgrade [BUILD]` | Move an instance to another build, keeping `~/Files` and `~/Apps` |
| `screen`, `wait screen [NAME]`, `wait app NAME` | What the device shows, as text; wait for it (see below) |
| `test [--snapshot TAG] [--app FILE] [--run APP] [--keys KEY...]` | One throwaway run that keeps the screen and the log |
| `mcp` | Offer the commands to an AI agent |
| `completion bash\|zsh\|fish` | Print a shell completion script |
| `builds [--remote]`, `fetch`, `profiles`, `rm-build` | Manage downloaded OS builds |
| `desktop install\|remove` | Application-menu launcher |
| `doctor`, `purge` | Check requirements; delete everything |

Several instances can run side by side: `f1emu start -n second --build 2490`.

## Scripts and AI agents

Every command takes `--json`: the result goes to stdout as JSON, everything
meant for people to stderr, and a failure is `{"ok": false, "error": ...}`
with exit code 1.

- `f1emu screen` reads flipctl's own log and reports the name of the screen
  (`idle`, `menu`, `apps`), the last menu entry opened, the app in front and
  the status line. flipctl does not log the words it draws, so for those a
  script still needs `screenshot`.
- `f1emu wait screen` returns when the panel's picture changes, `wait screen
  menu` when that screen is shown, `wait app NAME` when the app is in front.
  Menus slide in over about a second; the picture changes at the first frame
  of that.
- `f1emu test` boots a fresh instance of its own, copies in `--app` files,
  starts `--run`, presses `--keys`, writes `screen.png`, `screen.json` and
  `flipctl.log` to `--out`, and deletes the instance. `--snapshot TAG` starts
  from the disk of a snapshot of the instance named with `-n`. It boots from
  that disk; the snapshot's memory is not used.
- `f1emu mcp` is a Model Context Protocol server on stdin and stdout with the
  tools `status`, `start`, `stop`, `press`, `screen`, `screenshot`, `wait`,
  `apps`, `sim`, `shell` and `test`. For Claude Code:
  `claude mcp add f1emu -- f1emu mcp`. Exercised by hand with JSON-RPC lines,
  not yet with an agent.
- `ssh`, `press`, `screenshot`, `apps`, `screen` and `wait` take `--device
  ADDRESS` and then talk to a real Flipper One instead: its remote view is
  the same web server. Checked only against the emulated device's own port,
  never against real hardware; `ssh`, `screen` and `wait` need your SSH key
  on the device.

Defaults can be set in `~/.config/flipper-one-emu/config.toml`:

```toml
build = "2494"      # pin a known-good build instead of the newest
memory = 4096
cpus = 8
port = 8899
open = "app"        # browser | app | none
audio = true        # play the guest's sound on this PC
mic = false         # give the guest this PC's microphone
```

Data lives in `~/.local/share/flipper-one-emu`.

## Simulated hardware

`f1emu start --sim all`, or **Simulated hardware: turn on** in the remote
view. The first use compiles a few kernel modules for the image's kernel,
inside a throwaway instance; that takes a few minutes and is cached.

- **Wi-Fi:** a virtual Wi-Fi card (`mac80211_hwsim`) and three access points
  around it: `Flipper Lab` (WPA2, password `flipperone`, strong), `Coffee
  Shop Free WiFi` (open, medium) and `HomeNet` (WPA2, weak). Scanning and
  connecting work as on a real card, from the device's own menu too. A
  pretend phone rejoins `Flipper Lab` every 40 seconds, so a capture always
  has a handshake in it.
- **Battery and USB-C1:** a fake battery (`test_power`). It empties and fills
  with the power flow, as a 22.9 Wh pack would; `--speed 60` makes that sixty
  times faster, `--speed 0` keeps the level where it is set. The level, a
  charger, or a device drawing power from the Flipper can be set; the OS
  shows the matching power flow. `sim usb laptop` plugs in a computer: the OS
  brings up its USB network link (`flipusb0`) and gives the laptop its
  address, as it does on the real device. Sharing the internet over that
  link is added by the simulator; the OS itself only provides the link.
- **5G modem:** stand-ins for `mmcli`, `qmicli` and `nmcli` that answer the
  Flipper's interface with made-up readings, and a pretend operator on the
  far end of `wwan0`: data sent through it reaches the internet (by way of
  the Flipper's own Ethernet), and the route is the last choice, as a
  modem's is. The RSRP line shows `lte` instead of a number. The stand-in
  prints what the real `qmicli` prints, so this looks like flipctl's
  reading of it; unconfirmed without a real modem.
- **Laptop on ETH1:** a second machine on a virtual cable. The Flipper shares
  its connection with it, and `sim laptop run` runs commands on it.
- **Video output:** every instance has a screen, a keyboard and a pointer on
  its video port. `f1emu start --video`, `sim on video` or **Turn on** in the
  remote view loads the drivers for them. The picture is shown in the remote
  view; click it to use it with mouse and keyboard. The Desktop profile's KDE
  session appears there after a minute or two; it is slow. The Minimal
  profile has no desktop, so its screen stays dark until an app draws on it.

In the remote view the cables are shown at the device's real ports. ETH1
plugs in with a click, USB-C1 asks what to plug in. The lights follow the
simulated state:

- ETH0, ETH1 and WI-FI light while their port has a link, in the colours
  Flipper OS sets (`99-network-leds.rules` in its build scripts). The OS
  does not drive LINK, which is left for apps, so it stays dark.
- The power meter follows Flipper's own
  [power meter emulator](https://dev.repetren.com/power_meter_demo/), the
  reference for the firmware
  ([issue 254](https://github.com/flipperdevices/flipperone-mcu-firmware/issues/254)):
  bars for watts from the battery (one more every 2 W up to 8 W, colours
  beyond), chevrons for watts coming in (above 0, 7.5, 15 and 27 W). The
  firmware is unfinished and the published hardware docs draw it differently,
  so the real device may end up otherwise.

Tested in the page on build 2494, Minimal profile: every control of the
column, live snapshots, factory reset, shut down, and mouse and keyboard
reaching the guest's input devices. Not tested: the video output with the
Desktop profile's session, and more than one browser.

LoRa and the other radios are not simulated: nothing in the OS shows them.

## How it works

- The image's root partition is a btrfs filesystem with one subvolume per
  profile. `btrfs restore` reads the boot entries, kernel and initramfs from
  it in user space, so nothing is mounted and no root is needed.
- QEMU boots `virt` with UEFI and `acpi=off`. The Flipper kernel is
  device-tree only and panics in `time_init` when ACPI tables are present.
- The image is never modified. Each instance is a qcow2 overlay on top of it.
- Guest changes are passed as systemd credentials on the kernel command line:
  an SSH key, and a drop-in for `flipctl.service` that drops the missing
  `seat1` and selects software rendering. Without the drop-in the menus work
  but apps do not start.
- The address you open is a small local proxy in front of the device's web
  page. It passes everything through and adds one script that redraws the
  256x144 panel at a whole multiple, so text stays even at any window size.

## Limits

- On x86 the ARM CPU is emulated in software. KVM on an ARM64 host is wired
  up but untested.
- Sound works by tunnelling the guest's PipeWire to the PC's sound server,
  not through an emulated sound card. The microphone is off unless asked for.
- Without `sim`, there is no Wi-Fi, modem or battery. USB is never there:
  the kernel has no driver for any USB controller QEMU can emulate. GPIO
  cannot be simulated either: the kernel's `gpio-sim` needs the interrupt
  simulator, which Flipper's kernel is built without and which cannot be
  loaded as a module. Ethernet works through NAT.
- The Router profile boots, but its remote view and SSH do not answer
  through QEMU's network.
- The vendor 6.1 kernel has no virtio drivers, so the mainline kernel is used.
- Flipper publishes development builds several times a day and the image
  layout can change. Pin `build` in the config if a new one breaks.

## License and credits

GPL-3.0-or-later, see [LICENSE](LICENSE).

`sim/meter.json` holds the shapes of the power meter from the light guide
artwork in [flipperone-mechanics](https://github.com/flipperdevices/flipperone-mechanics)
(CERN-OHL-P-2.0, Flipper Devices Inc.). Port positions and the power meter's
behaviour follow [docs.flipper.net/one](https://docs.flipper.net/one). The
cable pictures in `sim/cables` are rendered by `tools/render_cables.py` from
models written for this project.
