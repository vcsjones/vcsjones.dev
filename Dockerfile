FROM mcr.microsoft.com/vscode/devcontainers/ruby:2.7
RUN bash -l -c 'rvm install ruby-2.7.1 && rvm use --default 2.7.1'