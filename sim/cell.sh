#!/bin/sh
# f1emu: the mobile network behind the pretend modem, so that data really flows
# through wwan0. The operator is a network namespace on the far end of a
# virtual cable; it reaches the internet back through the Flipper's own
# Ethernet, as a laptop on ETH1 would. The addresses are the ones the stand-in
# for mmcli reports.
set -e
D=/run/f1emu
case "$1" in
  up)
    ip netns list | grep -q '^f1cell' && exit 0
    lsmod | grep -q '^veth' || insmod $D/veth.ko
    # The modem simulator brings a wwan0 of its own, which swallows whatever is
    # sent into it. It gives up the name.
    ip link set wwan0 name wwansim0 2>/dev/null || true
    ip netns add f1cell
    ip link add wwan0 type veth peer name cell0 netns f1cell
    ip link add f1cellup type veth peer name up0 netns f1cell
    ip addr add 10.64.12.7 peer 10.64.12.8 dev wwan0
    ip link set wwan0 up
    # The way back out carries no address of its own: flipctl lists every
    # interface that has one, and this one is not part of the device.
    sysctl -qw net.ipv6.conf.f1cellup.disable_ipv6=1 net.ipv4.conf.f1cellup.proxy_arp=1
    ip link set f1cellup up
    ip route add 10.64.13.1 dev f1cellup
    ip netns exec f1cell sh -e <<'S'
ip link set lo up
ip addr add 10.64.12.8 peer 10.64.12.7 dev cell0
ip link set cell0 up
ip addr add 10.64.13.1/30 dev up0
ip link set up0 up
ip route add default dev up0
sysctl -qw net.ipv4.ip_forward=1
nft add table ip nat
nft 'add chain ip nat post { type nat hook postrouting priority 100 ; }'
nft add rule ip nat post oifname "up0" masquerade
S
    sysctl -qw net.ipv4.ip_forward=1
    nft add table ip f1cell
    nft 'add chain ip f1cell post { type nat hook postrouting priority 100 ; }'
    nft add rule ip f1cell post ip saddr 10.64.13.0/30 oifname != "f1cellup" masquerade
    # With no other way out, what the operator sends back for the internet would
    # be sent to the operator again, round and round.
    nft 'add chain ip f1cell noloop { type filter hook forward priority 0 ; }'
    nft add rule ip f1cell noloop iifname "f1cellup" oifname "wwan0" drop
    # The last choice, as a modem's route is next to Ethernet and Wi-Fi.
    ip route add default via 10.64.12.8 dev wwan0 metric 700
    ;;
  down)
    nft delete table ip f1cell 2>/dev/null || true
    ip link del wwan0 2>/dev/null || true
    ip link del f1cellup 2>/dev/null || true
    ip netns del f1cell 2>/dev/null || true
    ip link set wwansim0 name wwan0 2>/dev/null || true
    ;;
esac
