#!/bin/bash
cd /opt/cvenom/frontend

export NEXT_PUBLIC_API0_API_KEY=sk_live_5hXe-HDNPstg2bnUAEP9S8GIv5J4G36M
# Pass through all environment variables from PM2
exec node_modules/.bin/next start
