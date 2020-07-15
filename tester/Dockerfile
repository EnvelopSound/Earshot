FROM alpine:3.11
WORKDIR /
RUN apk add --update \
  ca-certificates \
  gettext \
  openssl \
  pcre \
  lame \
  libogg \
  curl \
  libass \
  libvpx \
  libvorbis \
  libwebp \
  libtheora \
  opus \
  rtmpdump \
  x264-dev \
  x265-dev \
  sudo \
  curl \
  bash

COPY bin/ffmpeg /usr/bin/ffmpeg
## copy test file
COPY resources/16chambixloop.wav /test.wav

COPY ./run-tests.sh /
