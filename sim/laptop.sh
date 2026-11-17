#!/bin/sh
# f1emu: a pretend laptop on a virtual network cable in the Flipper's second
# Ethernet port. The Flipper shares its internet over that cable, as a router
# would, and the laptop asks it for an address.
set -e
D=/run/f1emu
case "$1" in
  up)
    lsmod | grep -q '^veth' || insmod $D/veth.ko
    ip netns add laptop
    ip link add eth1 type veth peer name eth0 netns laptop
    ip netns exec laptop ip link set lo up
    ip netns exec laptop ip link set eth0 up
    nmcli connection add save no type ethernet ifname eth1 con-name f1emu-laptop ipv4.method shared ipv6.method disabled >/dev/null
    nmcli connection up f1emu-laptop >/dev/null
    cat > $D/udhcpc.sh <<'S'
#!/bin/sh
case "$1" in bound|renew)
  ip addr replace "$ip/${mask:-24}" dev "$interface"
  ip route replace default via "$router"
  mkdir -p /etc/netns/laptop && echo "nameserver $dns" > /etc/netns/laptop/resolv.conf;;
esac
S
    chmod +x $D/udhcpc.sh
    ip netns exec laptop busybox udhcpc -i eth0 -b -p $D/udhcpc.pid -s $D/udhcpc.sh >/dev/null 2>&1
    ;;
  down)
    [ -f $D/udhcpc.pid ] && kill "$(cat $D/udhcpc.pid)" 2>/dev/null || true
    nmcli connection delete f1emu-laptop >/dev/null 2>&1 || true
    ip link del eth1 2>/dev/null || true
    ip netns del laptop 2>/dev/null || true
    rm -rf /etc/netns/laptop
    ;;
esac
