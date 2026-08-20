# set the base image
# n/b: for production, node is only used for building
# the static Html and javascript files
# as react creates static html and js files after build
# these are what will be served by nginx
# use alias build to be easier to refer this container elsewhere
# e.g inside nginx container
FROM node:24-alpine3.24
# set working directory
# this is the working folder in the container
# from which the app will be running from
WORKDIR /app
# copy everything to /app directory
# as opposed to on dev, in prod everything is copied to docker
COPY ./webtools/ /app
# add the node_modules folder to $PATH
ENV PATH /app/node_modules/.bin:$PATH

# install and cache dependencies
# yarn 1.x defaults --network-timeout to 30 s, and that ceiling covers the CPU
# time yarn spends alongside each request, not transfer alone. On a slower build
# host it expires mid-install and yarn reports it as "There appears to be trouble
# with your network connection", which points at the wrong subsystem. Raised so
# the install can finish; it costs nothing on a fast host, where the install
# completes long before the ceiling is in reach.
#
# webpack 4's default content-hash function calls Node's crypto.createHash
# ('md4'), which OpenSSL 3 (Node 17+) refuses by default -
# ERR_OSSL_EVP_UNSUPPORTED. Re-enabling the legacy provider is the standard
# fix for a webpack4-era build that isn't being upgraded to webpack 5; it
# only affects this build step, never a running service.
ENV NODE_OPTIONS=--openssl-legacy-provider
RUN yarn --network-timeout 600000
#build the project for production
RUN yarn build

##############################
# Build the NGINX-build image.
FROM alpine:3.11
ARG NGINX_VERSION=1.15.1
ARG NGINX_RTMP_VERSION=1.2.1

ARG FFMPEG_VERSION=7.1
ARG FFMPEG_SHA256=40973d44970dbc83ef302b0609f2e74982be2d85916dd2ee7472d30678a7abe6

ARG PREFIX=/opt/ffmpeg
ARG LD_LIBRARY_PATH=/opt/ffmpeg/lib
ARG MAKEFLAGS="-j4"


# Build dependencies.
RUN apk add --update \
  build-base \
  coreutils \
  freetype-dev \
  gcc \
  lame-dev \
  libogg-dev \
  libass \
  libass-dev \
  libvpx-dev \
  libvorbis-dev \
  libwebp-dev \
  libtheora-dev \
  opus-dev \
  openssl \
  openssl-dev \
  pkgconf \
  pkgconfig \
  rtmpdump-dev \
  wget \
  xz \
  x264-dev \
  x265-dev \
  yasm \
  ca-certificates \
  curl \
  libc-dev \
  libgcc \
  linux-headers \
  make \
  musl-dev \
  pcre \
  pcre-dev \
  zlib-dev \
  inotify-tools \
  certbot

# Get FFmpeg source from the ffmpeg.org release tarball and verify it against a
# pinned SHA-256. The release .tar.xz is a signed, immutable artifact; GitHub's
# /archive/refs/tags/ tarballs are generated on demand and their bytes (hence
# hash) have changed before, so a pin is only meaningful against the release
# tarball, not the archive URL. This hash is the one FFmpeg's release signing
# key (FCF9 86EA 15E6 E293 A564 4F10 B432 2F04 D676 58D8) signs for 7.1; a
# mismatch aborts the build rather than compiling unexpected source.
RUN cd /tmp/ && \
  wget -O ffmpeg-${FFMPEG_VERSION}.tar.xz https://ffmpeg.org/releases/ffmpeg-${FFMPEG_VERSION}.tar.xz && \
  echo "${FFMPEG_SHA256}  ffmpeg-${FFMPEG_VERSION}.tar.xz" | sha256sum -c - && \
  xz -dc ffmpeg-${FFMPEG_VERSION}.tar.xz | tar -xf - && rm ffmpeg-${FFMPEG_VERSION}.tar.xz

# ffmpeg's DASH muxer hardcodes suggestedPresentationDelay to the last
# segment duration, so a player joining live starts right at the edge and
# can gap-jump into a segment that has not finished writing yet. No muxer
# flag controls SPD directly (-target_latency is force-zeroed outside
# LL-DASH mode, which WebM segments cannot use), so this floors it at the
# source instead.
ARG DASH_SPD_FLOOR=30
RUN cd /tmp/ffmpeg-${FFMPEG_VERSION} && \
  case "${DASH_SPD_FLOOR}" in (""|*[!0-9]*) echo "DASH_SPD_FLOOR must be a non-negative integer" >&2; exit 1;; esac && \
  test "$(grep -c 'suggestedPresentationDelay=' libavformat/dashenc.c)" = "1" && \
  grep -F 'suggestedPresentationDelay=' libavformat/dashenc.c | grep -F 'c->last_duration / AV_TIME_BASE' && \
  sed -i "/suggestedPresentationDelay=/s|c->last_duration / AV_TIME_BASE|FFMAX(c->last_duration / AV_TIME_BASE, ${DASH_SPD_FLOOR})|" libavformat/dashenc.c && \
  grep -F 'suggestedPresentationDelay=' libavformat/dashenc.c | grep -F "FFMAX(c->last_duration / AV_TIME_BASE, ${DASH_SPD_FLOOR})"

# --enable-nonfree gates GPL-incompatible libraries (e.g. libfdk_aac); this
# build links none of them, so the flag is a no-op that only marks the binary
# non-redistributable. Default on (behaviour unchanged); build with
# --build-arg ENABLE_NONFREE=0 for a redistributable image.
ARG ENABLE_NONFREE=1
# Compile ffmpeg.
RUN cd /tmp/ffmpeg-${FFMPEG_VERSION} && \
   ./configure \
   --enable-version3 \
   --enable-gpl \
   $( [ "${ENABLE_NONFREE}" = "1" ] && printf '%s' '--enable-nonfree' ) \
   --enable-small \
   --enable-libx264 \
   --enable-libopus \
   --enable-libvpx \
   --disable-debug \
   --disable-doc \
   --disable-ffplay \
   --extra-cflags="-I${PREFIX}/include" \
   --extra-ldflags="-L${PREFIX}/lib" \
   --extra-libs="-lpthread -lm" \
   --prefix="${PREFIX}" && \
    make && make install && make distclean

#COPY /tmp/ffmpeg-${FFMPEG_VERSION}/build/ffmpeg /usr/local/bin/

# Get nginx source.
RUN cd /tmp && \
  wget https://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz && \
  tar zxf nginx-${NGINX_VERSION}.tar.gz && \
  rm nginx-${NGINX_VERSION}.tar.gz

# Get nginx-rtmp module.
RUN cd /tmp && \
  wget https://github.com/arut/nginx-rtmp-module/archive/v${NGINX_RTMP_VERSION}.tar.gz && \
  tar zxf v${NGINX_RTMP_VERSION}.tar.gz && rm v${NGINX_RTMP_VERSION}.tar.gz

# Compile nginx with nginx-rtmp module.
RUN cd /tmp/nginx-${NGINX_VERSION} && \
  ./configure \
  --prefix=/usr/local/nginx \
  --add-module=/tmp/nginx-rtmp-module-${NGINX_RTMP_VERSION} \
  --conf-path=/etc/nginx/nginx.conf \
  --with-threads \
  --with-file-aio \
  --with-http_ssl_module \
  --with-debug \
  --with-cc-opt="-Wimplicit-fallthrough=0" && \
  cd /tmp/nginx-${NGINX_VERSION} && make && make install

##########################
# Build the release image.
FROM alpine:3.11
LABEL MAINTAINER Alfred Gutierrez <alf.g.jr@gmail.com>

# Set default ports.
ENV HTTP_PORT 80
ENV HTTPS_PORT 443
ENV RTMP_PORT 1935

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
  inotify-tools \
  certbot \
  sudo

COPY --from=1 /opt/ffmpeg/bin/ffmpeg /usr/local/bin
COPY --from=1 /usr/local/nginx /usr/local/nginx
COPY --from=1 /etc/nginx /etc/nginx

# Add NGINX path, config and static files.
ENV PATH "${PATH}:/usr/local/nginx/sbin"
ADD nginx-transcoder/nginx.conf /etc/nginx/nginx.conf.template
ADD nginx-transcoder/nginx-no-ssl.conf /etc/nginx/nginx-no-ssl.conf.template
ADD nginx-transcoder/static /www/static

# Cleanup.
RUN rm -rf /var/cache/* /tmp/*

# Copy special FFMPEG build for alpine
# Uses pkviet's pce2 fork which supports PCE headers in RTMP
# This is required to properly decode 16.0 RTMP from OBS-ME
#
# https://github.com/pkviet/FFmpeg

COPY --from=0 /app/build /www/webtools

EXPOSE 1935
EXPOSE 8000

# Add the nginx user since we don't want to run as root
RUN set -x ; \
    addgroup -g 82 nginx ; \
    adduser -u 82 -D -h /home/nginx -s /bin/sh -G nginx nginx && exit 0 ; exit 1

COPY nginx-transcoder/entrypoint.sh nginx-letsencrypt
COPY nginx-transcoder/certbot.sh certbot.sh
COPY nginx-transcoder/ssl-options/ /etc/ssl-options
RUN chmod +x nginx-letsencrypt && \
    chmod +x certbot.sh

#CMD rm -rf /opt/data && mkdir -p /opt/data/dash && chown nginx /opt/data/dash && chmod 777 /opt/data/dash && mkdir -p /www && \
#  envsubst "$(env | sed -e 's/=.*//' -e 's/^/\$/g')" < \
#  /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && \
#nginx
# SSL usage
ENTRYPOINT ["./nginx-letsencrypt"]
