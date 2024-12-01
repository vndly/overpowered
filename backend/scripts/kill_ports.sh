#!/usr/bin/env bash

lsof -ti tcp:9099 | xargs kill -9
lsof -ti tcp:9005 | xargs kill -9
lsof -ti tcp:5001 | xargs kill -9
lsof -ti tcp:8080 | xargs kill -9
lsof -ti tcp:9199 | xargs kill -9
lsof -ti tcp:4000 | xargs kill -9
lsof -ti tcp:8085 | xargs kill -9
lsof -ti tcp:9229 | xargs kill -9