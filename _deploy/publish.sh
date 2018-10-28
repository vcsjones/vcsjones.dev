#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
pushd $DIR/..
gem install bundler --no-doc
bundle install
yarn install && gulp
popd