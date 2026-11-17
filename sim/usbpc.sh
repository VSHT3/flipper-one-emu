#!/bin/sh
# f1emu: a pretend laptop on the Flipper's USB-C1 port. To the OS it looks like
# the USB network link it makes when plugged into a computer (flipusb0), and
# the OS's own settings give that computer an address. Sharing the Flipper's
# internet over that link is this script's doing, not the OS's: it turns on
# forwarding and points the laptop at the Flipper.
set -e
D=/run/f1emu
case "$1" in
  up)
    ip netns list | grep -q '^usblaptop' && exit 0
    lsmod | grep -q '^veth' || insmod $D/veth.ko
    ip netns add usblaptop
    ip link add flipusb0 type veth peer name usb0 netns usblaptop
    ip netns exec usblaptop ip link set lo up
    # Always the same laptop: the OS hands out exactly one address on this link
    # and remembers who has it, so a new stranger on every plug-in gets none.
    ip netns exec usblaptop ip link set usb0 address 02:f1:e0:00:00:02
    ip netns exec usblaptop ip link set usb0 up
    # NetworkManager leaves virtual cables alone unless told otherwise; once it
    # takes this one, the OS's own flipusb0 profile and DHCP service apply.
    nmcli device set flipusb0 managed yes
    # Not waited for: the laptop keeps asking for an address until it is up.
    nmcli --wait 0 connection up flipusb0-static >/dev/null 2>&1 || true
    cat > $D/usbpc-dhcp.sh <<'S'
#!/bin/sh
case "$1" in bound|renew)
  ip addr replace "$ip/${mask:-24}" dev "$interface"
  ip route replace default via 10.0.0.1;;
esac
S
    chmod +x $D/usbpc-dhcp.sh
    mkdir -p /etc/netns/usblaptop
    # The OS's own resolv.conf points at a resolver on its loopback, which the
    # laptop cannot reach; this file lists the servers behind it.
    grep nameserver /run/systemd/resolve/resolv.conf > /etc/netns/usblaptop/resolv.conf
    sysctl -qw net.ipv4.ip_forward=1
    nft add table ip f1emu
    nft 'add chain ip f1emu post { type nat hook postrouting priority 100 ; }'
    nft add rule ip f1emu post ip saddr 10.0.0.0/24 oifname != "flipusb0" masquerade
    # Started detached: asked to go to the background by itself, it first sits
    # through every retry, a minute, before it does.
    setsid ip netns exec usblaptop busybox udhcpc -i usb0 -f -p $D/usbpc.pid -s $D/usbpc-dhcp.sh >/dev/null 2>&1 &
    ;;
  down)
    [ -f $D/usbpc.pid ] && kill "$(cat $D/usbpc.pid)" 2>/dev/null || true
    nft delete table ip f1emu 2>/dev/null || true
    ip link del flipusb0 2>/dev/null || true
    ip netns del usblaptop 2>/dev/null || true
    rm -rf /etc/netns/usblaptop
    ;;
esac
