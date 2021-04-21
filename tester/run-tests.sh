#! /bin/bash
# exit when any command fails
set -e

# Wait some time before running tests...
sleep 10

# Test auth
AUTH_URL="http://nginx-rtmp:80/auth?token=${RTMP_AUTH_TOKEN}"

echo "Running AUTH test"
echo "Auth URL is: ${AUTH_URL}"
status_code=$(curl --write-out %{http_code} --silent --output /dev/null ${AUTH_URL})

if [[ "$status_code" -ne 201 ]] ; then
  echo "Auth test was unsuccessful. Status reported: $status_code"
  exit -1
fi


AUTH_URL="http://nginx-rtmp:80/auth"

FAKE_AUTH="thisWillFail"
AUTH_URL="http://nginx-rtmp:80/auth?token=${FAKE_AUTH}"
echo "Running fake AUTH test"
echo "Auth URL is: ${AUTH_URL}"

status_code=$(curl --write-out %{http_code} --silent --output /dev/null ${AUTH_URL})

if [[ "$status_code" -eq 201 ]] ; then
  echo "Fake auth test was not successful. Exiting"
  exit -1
fi

echo "AUTH test passed!"

sleep 10
bash -c "ffmpeg -y -stream_loop -1 -i test.wav -af \"channelmap=channel_layout=hexadecagonal\" -c:a aac -ac 16 -b:a 2048k -f flv \"rtmp://nginx-rtmp:1935/live/stream1?token=${RTMP_AUTH_TOKEN}\" &"
sleep 30
echo "Testing HTTP"
curl --fail http://nginx-rtmp:80/dash/stream1.mpd
sleep 5
# only test SSL if it is enabled
if [ "$SSL_ENABLED" = true ] ; then
	echo "Testing HTTPS"
	curl --fail -k https://nginx-rtmp:443/dash/stream1.mpd
fi
