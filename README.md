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

| Command | What it does |
|---|---|
| `start` | Boot. Options: `--build`, `--variant`, `--profile`, `--kernel`, `-m`, `-c`, `-p`, `--ssh-port`, `--listen`, `--forward`, `--no-network`, `--no-audio`, `--mic`, `--disk-size`, `--ephemeral`, `--open browser\|app\|none`, `--display gtk`, `--append`, `--qemu-arg`, `-n NAME` |
| `stop [--force] [--all]` | Clean shutdown, or kill |
| `ssh [--root] [-- CMD]` | Shell in the guest (`user` has passwordless sudo) |
| `push` / `pull` | Copy files in and out (`push` defaults to `~/Files/`) |
| `mount DIR [GUEST_DIR]` / `umount` | Show the device's `~/Files` (or another folder) as a folder on the PC |
| `audio on\|off [--mic]` | Connect the guest's sound, and optionally the PC microphone, while it runs |
| `apps list\|install\|run\|remove` | The device's App Manager from the terminal |
| `apps add FILE` | Copy your own `.fap.AppImage` or `.fap.py` into the device's app list |
| `sim on [wifi battery modem laptop]` | Load pretend hardware (see below); `sim status` shows it |
| `sim battery LEVEL`, `sim usb none\|charger\|device` | Set the battery, and what is plugged into USB-C1 |
| `sim modem --signal N --operator NAME --tech lte\|5gnr` | Set what the 5G modem screen reports |
| `sim laptop on\|off\|run CMD` | A pretend laptop on ETH1 that gets its internet from the Flipper |
| `sim pcap FILE [--seconds N]` | Capture the simulated Wi-Fi air, WPA2 handshakes included |
| `press KEY...` | Press device buttons |
| `screenshot FILE [--scale N] [--grey] [--vt] [--video]` | Save the panel (or the boot console, or the video output) as PNG |
| `log [-f] [--journal]` | Boot console or systemd journal |
| `snapshot save\|load\|delete\|list` | Disk snapshots of a stopped instance |
| `reset` | Factory reset one instance |
| `builds [--remote]`, `fetch`, `profiles`, `rm-build` | Manage downloaded OS builds |
| `desktop install\|remove` | Application-menu launcher |
| `doctor`, `purge` | Check requirements; delete everything |

Several instances can run side by side: `f1emu start -n second --build 2490`.

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
  around it: `Flipper Lab` (WPA2, password `flipperone`), `Coffee Shop Free
  WiFi` (open) and `HomeNet`. Scanning and connecting work as on a real card.
  A pretend phone rejoins `Flipper Lab` every 40 seconds, so a capture always
  has a handshake in it. Every signal is full strength.
- **Battery and USB-C1:** a fake battery (`test_power`). The level, a charger,
  or a device drawing power from the Flipper can be set; the OS shows the
  matching power flow.
- **5G modem:** stand-ins for `mmcli`, `qmicli` and `nmcli` that answer the
  Flipper's interface with made-up readings. The screens fill in; no data
  flows. The RSRP line shows `lte` instead of a number.
- **Laptop on ETH1:** a second machine on a virtual cable. The Flipper shares
  its connection with it, and `sim laptop run` runs commands on it.
- **Video output:** `f1emu start --video` adds a display, a keyboard and a
  pointer and opens them in a window. The Desktop profile's KDE session
  appears there after a minute or two; it is slow.

In the remote view the cables are shown at the device's real ports and
plug in with a click, and the power meter and the status lights follow the
simulated state. The power meter lights the way Flipper's hardware docs
describe; how many watts one segment stands for is a guess (3 W). What the
LINK light means is also a guess: green when the internet is reachable.

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
- Without `sim`, there is no Wi-Fi, modem or battery. GPIO and USB are never
  there: the kernel has no driver for any USB controller QEMU can emulate.
  Ethernet works through NAT.
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
