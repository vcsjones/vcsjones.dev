#!/bin/bash
source /etc/profile.d/rvm.sh
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
pushd $DIR/..
gem install bundler --no-doc
bundle install
yarn install && gulp
popd