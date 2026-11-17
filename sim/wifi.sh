#!/bin/sh
# f1emu: a virtual Wi-Fi card for the Flipper (wlan0) and pretend access points
# around it. The access points live in their own network namespace, as separate
# machines would, so the Flipper's own network setup never sees their side.
set -e
D=/run/f1emu
modprobe mac80211
insmod $D/mac80211_hwsim.ko radios=5
ip netns add f1sim
ap() {  # ap RADIO SSID FREQ TXPOWER [PASSWORD]
  phy=$(basename "$(readlink /sys/class/net/wlan$1/phy80211)")
  iw phy "$phy" set netns name f1sim
  {
    printf 'network={\n ssid="%s"\n mode=2\n frequency=%s\n' "$2" "$3"
    if [ -n "$5" ]; then printf ' key_mgmt=WPA-PSK\n proto=RSN\n pairwise=CCMP\n psk="%s"\n' "$5"; else printf ' key_mgmt=NONE\n'; fi
    printf '}\n'
  } > $D/ap$1.conf
  ip netns exec f1sim wpa_supplicant -B -i wlan$1 -c $D/ap$1.conf -P $D/ap$1.pid >/dev/null
  ip netns exec f1sim iw dev wlan$1 set txpower fixed "$4" 2>/dev/null || true
  ip netns exec f1sim ip addr add 10.77.$1.1/24 dev wlan$1
  ip netns exec f1sim dnsmasq --interface=wlan$1 --bind-interfaces --except-interface=lo --no-resolv --port=0 \
    --dhcp-range=10.77.$1.10,10.77.$1.99,1h --dhcp-option=3 --dhcp-option=6 --pid-file=$D/dnsmasq$1.pid
}
ap 1 "Flipper Lab" 2412 2000 "flipperone"
ap 2 "Coffee Shop Free WiFi" 2437 2000
ap 3 "HomeNet" 2462 2000 "correct horse battery"

# A pretend phone that joins "Flipper Lab" and rejoins every 40 seconds, so there
# is always traffic, and a fresh WPA2 handshake, in the air to look at.
phy=$(basename "$(readlink /sys/class/net/wlan4/phy80211)")
ip netns add f1phone
iw phy "$phy" set netns name f1phone
mkdir -p $D/phone
printf 'ctrl_interface=%s/phone\nnetwork={\n ssid="Flipper Lab"\n psk="flipperone"\n}\n' $D > $D/phone.conf
ip netns exec f1phone wpa_supplicant -B -i wlan4 -c $D/phone.conf -P $D/phone.pid >/dev/null
ip netns exec f1phone ip addr add 10.77.1.200/24 dev wlan4
setsid sh -c "while sleep 40; do ip netns exec f1phone wpa_cli -p $D/phone -i wlan4 reassociate; ip netns exec f1phone ping -c 3 -W 1 10.77.1.1; done" >/dev/null 2>&1 &
# The tap that sees every frame of the simulated air.
ip link set hwsim0 up
