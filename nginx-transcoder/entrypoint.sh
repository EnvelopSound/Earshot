#!/bin/sh
# Create a self signed default certificate, so Ngix can start before we have
# any real certificates.

#Ensure we have folders available

# DASH manifest filename. This is the only variable component of the ffmpeg
# output path in either transcoder config (nginx-no-ssl.conf / nginx.conf), so
# it is defaulted and validated here, before nginx starts and before either
# envsubst call below. It must be exported: the envsubst whitelist is derived
# from `env`, so an unexported value would leave the literal ${DASH_NAME} in
# the rendered config, and ffmpeg would write a file nobody fetches. It is
# read only from the container environment, never from the network, and
# rejecting '.' and '/' makes '..' and absolute paths unrepresentable.
DASH_NAME="${DASH_NAME:-stream}"
case "$DASH_NAME" in
    ''|*[!A-Za-z0-9_-]*)
        echo "[earshot] DASH_NAME must be a non-empty [A-Za-z0-9_-]+ string (got: $DASH_NAME)" >&2
        exit 1 ;;
esac
export DASH_NAME

if [ "$SSL_ENABLED" = true ] ; then

	if [ "$DOMAIN" = "" ]; then
		echo "Cannot start Earshot"
		echo "Please make sure you have configured your environment correctly."
		echo "The following environment variable was not set: DOMAIN"
		exit -1;
	fi
	if [ "$EMAIL" = "" ]; then
		echo "Cannot start Earshot"
		echo "Please make sure you have configured your environment correctly."
		echo "The following environment variable was not set: EMAIL"

		exit -1;
	fi

	echo "Running Earshot in SSL mode"

	if [[ ! -f /usr/share/nginx/certificates/fullchain.pem ]];then
	    mkdir -p /usr/share/nginx/certificates
	fi

	### If certificates don't exist yet we must ensure we create them to start nginx
	if [[ ! -f /usr/share/nginx/certificates/fullchain.pem ]]; then
	    openssl genrsa -out /usr/share/nginx/certificates/privkey.pem 4096
	    openssl genrsa -out /usr/share/nginx/certificates/privkey.pem 4096
	    openssl req -new -key /usr/share/nginx/certificates/privkey.pem -out /usr/share/nginx/certificates/cert.csr -nodes -subj \
	    "/C=PT/ST=World/L=World/O=${DOMAIN:-example.org}/OU=${DOMAIN:-example.org} lda/CN=${DOMAIN:-example.org}/EMAIL=${EMAIL:-info@example.org}"
	    openssl x509 -req -days 365 -in /usr/share/nginx/certificates/cert.csr -signkey /usr/share/nginx/certificates/privkey.pem -out /usr/share/nginx/certificates/fullchain.pem
	fi



	mkdir -p /opt/data/dash && find /opt/data/dash -mindepth 1 -delete && chown nginx /opt/data/dash && chmod 777 /opt/data/dash && mkdir -p /www && \
	  envsubst "$(env | sed -e 's/=.*//' -e 's/^/\$/g')" < \
	  /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
	### Send certbot Emission/Renewal to background
	$(while :; do /certbot.sh; sleep "${RENEW_INTERVAL:-12h}"; done;) &

	### Check for changes in the certificate (i.e renewals or first start) and send this process to background
	$(while inotifywait -e close_write /usr/share/nginx/certificates; do nginx -s reload; done) &

else
	echo "Running Earshot without SSL (connections will be insecure)"
	mkdir -p /opt/data/dash && find /opt/data/dash -mindepth 1 -delete && chown nginx /opt/data/dash && chmod 777 /opt/data/dash && mkdir -p /www && \
	  envsubst "$(env | sed -e 's/=.*//' -e 's/^/\$/g')" < \
	  /etc/nginx/nginx-no-ssl.conf.template > /etc/nginx/nginx.conf
fi

nginx
