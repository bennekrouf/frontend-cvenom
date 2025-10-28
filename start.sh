#!/bin/bash
cd /opt/cvenom/frontend

# Pass through all environment variables from PM2
exec node_modules/.bin/next start
