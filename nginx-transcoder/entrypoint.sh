#!/bin/sh
# Create a self signed default certificate, so Ngix can start before we have
# any real certificates.

#Ensure we have folders available

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


rm -rf /opt/data && mkdir -p /opt/data/dash && chown nginx /opt/data/dash && chmod 777 /opt/data/dash && mkdir -p /www && \
  envsubst "$(env | sed -e 's/=.*//' -e 's/^/\$/g')" < \
  /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf


### Send certbot Emission/Renewal to background
$(while :; do /certbot.sh; sleep "${RENEW_INTERVAL:-12h}"; done;) &

### Check for changes in the certificate (i.e renewals or first start) and send this process to background
$(while inotifywait -e close_write /usr/share/nginx/certificates; do nginx -s reload; done) &

nginx
