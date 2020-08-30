#! /bin/bash
# exit when any command fails
set -e
sleep 10
bash -c "ffmpeg -y -stream_loop -1 -i test.wav -af \"channelmap=channel_layout=hexadecagonal\" -c:a aac -ac 16 -b:a 2048k -f flv \"rtmp://nginx-rtmp:1935/live/stream1?token=${RTMP_AUTH_TOKEN}\" &"
sleep 30
curl --fail http://nginx-rtmp:80/dash/stream1.mpd
