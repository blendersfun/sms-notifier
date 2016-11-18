#!/usr/bin/env bash
sudo docker rm -f sms-notifier && \
	sudo docker build -t sms-notifier . && \
	sudo docker run -d --name sms-notifier -v $PWD/secrets:/usr/src/app/secrets sms-notifier && \
	sudo docker exec -it sms-notifier /bin/bash
