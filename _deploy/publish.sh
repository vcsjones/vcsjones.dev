#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
pushd $DIR/..
npm install && gulp
popd
rm -rf /var/wwwroot/vcsjones.com/*