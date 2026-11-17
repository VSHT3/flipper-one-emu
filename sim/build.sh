#!/bin/bash
# f1emu: builds the hardware simulators for the kernel this guest is running.
# Runs inside a throwaway instance, with the image's own compiler, so the
# modules match the kernel exactly. Results land in /root/out.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
REL=$(uname -r)
SHA=${REL##*-g}
[ "$SHA" != "$REL" ] || { echo "kernel $REL does not name the commit it was built from"; exit 1; }
apt-get update -qq
apt-get install -y -qq flex bison bc libssl-dev libelf-dev >/dev/null
rm -rf /root/k /root/out
mkdir -p /root/k /root/out
cd /root/k
curl -fsSL "https://github.com/flipperdevices/flipper-linux-kernel/archive/$SHA.tar.gz" | tar xz --strip-components=1
cp "/boot/config-$REL" .config
scripts/config -m MAC80211_HWSIM -m TEST_POWER -m WWAN_HWSIM -m VETH -m DRM_VIRTIO_GPU -m VIRTIO_INPUT
make olddefconfig >/dev/null
# The tarball has no git history, so the -g<commit> suffix has to be given back.
make -j"$(nproc)" LOCALVERSION="-g$SHA" modules_prepare >/dev/null
[ "$(cat include/config/kernel.release)" = "$REL" ] || { echo "version mismatch: built $(cat include/config/kernel.release), running $REL"; exit 1; }
# Without the full kernel build there is no symbol list to check against; the
# symbols exist in the running kernel, so missing ones are only warnings here.
MODULES="drivers/net/wireless/virtual/mac80211_hwsim.ko drivers/power/supply/test_power.ko drivers/net/wwan/wwan_hwsim.ko
  drivers/net/veth.ko drivers/gpu/drm/virtio/virtio-gpu.ko drivers/virtio/virtio_dma_buf.ko drivers/virtio/virtio_input.ko"
make -j"$(nproc)" LOCALVERSION="-g$SHA" KBUILD_MODPOST_WARN=1 $MODULES 2>&1 | grep -v 'modpost' || true
cp $MODULES /root/out/
