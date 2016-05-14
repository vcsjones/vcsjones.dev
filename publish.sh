#!/bin/bash
rvm use 2.3.0
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
pushd $DIR
npm install && gulp
popd