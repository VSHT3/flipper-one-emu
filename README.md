# f1emu

Runs Flipper One OS on a Linux PC in QEMU. One Python file, no root.

It downloads an official Flipper OS image, reads the kernel out of it, boots
it and opens the device's remote view in a browser. The OS, menus, App
Manager and apps come from the image unmodified; only the hardware is
emulated.

Unofficial, not affiliated with Flipper Devices. This repository contains no
Flipper software; images are downloaded from `dl-linux-images.flipp.dev`.

## Requirements

`qemu-system-aarch64`, AArch64 UEFI firmware (EDK2), `qemu-img`, `zstd`,
`btrfs-progs`, `ssh`, Python 3.11+. About 10 GB of free disk.

| Distro | Install |
|---|---|
| Arch | `pacman -S qemu-system-aarch64 qemu-img zstd btrfs-progs openssh` |
| Debian/Ubuntu | `apt install qemu-system-arm qemu-efi-aarch64 qemu-utils zstd btrfs-progs openssh-client` |
| Fedora | `dnf install qemu-system-aarch64 edk2-aarch64 qemu-img zstd btrfs-progs openssh-clients` |

Only the Arch line has been tested. `f1emu doctor` reports what is missing.

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
| `start` | Boot. Options: `--build`, `--variant`, `--profile`, `--kernel`, `-m`, `-c`, `-p`, `--ssh-port`, `--listen`, `--forward`, `--no-network`, `--disk-size`, `--ephemeral`, `--open browser\|app\|none`, `--display gtk`, `--append`, `--qemu-arg`, `-n NAME` |
| `stop [--force] [--all]` | Clean shutdown, or kill |
| `ssh [--root] [-- CMD]` | Shell in the guest (`user` has passwordless sudo) |
| `push` / `pull` | Copy files in and out (`push` defaults to `~/Files/`) |
| `apps list\|install\|run\|remove` | The device's App Manager from the terminal |
| `press KEY...` | Press device buttons |
| `screenshot FILE [--scale N] [--grey] [--vt]` | Save the panel (or the boot console) as PNG |
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
```

Data lives in `~/.local/share/flipper-one-emu`.

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

## Limits

- On x86 the ARM CPU is emulated in software. KVM on an ARM64 host is wired
  up but untested.
- No Wi-Fi, modem, battery, GPIO, sound or microphone. Ethernet works
  through NAT.
- Only the 256x144 panel is shown. Profiles other than Minimal are untested,
  and their HDMI output has no screen.
- The vendor 6.1 kernel has no virtio drivers, so the mainline kernel is used.
- Flipper publishes development builds several times a day and the image
  layout can change. Pin `build` in the config if a new one breaks.

## License

GPL-3.0-or-later, see [LICENSE](LICENSE).
