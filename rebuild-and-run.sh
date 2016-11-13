#!/usr/bin/env bash
docker rm -f sms-notifier && \
    docker build -t sms-notifier . && \
    docker run -d --name sms-notifier -v /Users/mooreaa/repos/sms-notifier/secrets:/usr/src/app/secrets sms-notifier && \
    docker exec -it sms-notifier /bin/bash
