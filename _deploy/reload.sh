#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
rsync -r --delete --existing --ignore-non-existing "$DIR" "/var/wwwroot/vcsjones.com/"
service nginx reload