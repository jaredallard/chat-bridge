#!/usr/bin/env bash

echo "Starting chat-bridge"
node index.js --test &

echo "Waiting 5 seconds"
sleep 5
./node_modules/.bin/mocha
