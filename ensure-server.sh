#!/bin/bash
if ! ss -tlnp 2>/dev/null | grep -q ":3000"; then
  cd /home/z/my-project
  nohup node node_modules/.bin/next dev -p 3000 >> /home/z/my-project/dev.log 2>&1 &
  disown -a
fi
