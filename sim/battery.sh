#!/bin/sh
# f1emu: lets the pretend battery empty and fill as a real one would. The fake
# battery only ever reports the numbers it was given, so this adds up the power
# flowing in or out and moves the level to match.
# Run as `battery.sh SPEED`: SPEED times faster than a real battery.
D=/run/f1emu
P=/sys/module/test_power/parameters
SPEED=${1:-1}
STEP=5
# One percent of the pack, in microwatt-seconds. The pack holds 22.9 Wh
# (docs.flipper.net/one/general/tech-specs).
ONE=824400000
echo $$ > $D/battery.pid
acc=0
while sleep $STEP; do
  level=$(cat $P/battery_capacity)
  was=$level
  # A full battery stops taking current; once it is no longer full, the
  # source in USB-C1 charges it again with what that source can give. Told by
  # the current: the fake battery's status does not read back.
  now=$(cat $P/battery_current)
  can=$(cat $D/cable_current)
  if [ "$now" -gt 0 ] && [ "$level" -ge 100 ]; then
    echo full > $P/battery_status
    echo 0 > $P/battery_current
  elif [ "$now" -eq 0 ] && [ "$can" -gt 0 ] && [ "$level" -lt 100 ]; then
    echo charging > $P/battery_status
    echo "$can" > $P/battery_current
  fi
  # Milliamps times millivolts is microwatts.
  acc=$(( acc + $(cat $P/battery_current) / 1000 * ($(cat $P/battery_voltage) / 1000) * STEP * SPEED ))
  while [ $acc -ge $ONE ] && [ "$level" -lt 100 ]; do level=$((level + 1)); acc=$((acc - ONE)); done
  while [ $acc -le -$ONE ] && [ "$level" -gt 0 ]; do level=$((level - 1)); acc=$((acc + ONE)); done
  # At either end there is nothing left to add up.
  if [ "$level" -ge 100 ] || [ "$level" -le 0 ]; then acc=0; fi
  [ "$level" = "$was" ] || echo "$level" > $P/battery_capacity
done
