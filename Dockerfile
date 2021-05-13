# set the base image
# n/b: for production, node is only used for building
# the static Html and javascript files
# as react creates static html and js files after build
# these are what will be served by nginx
# use alias build to be easier to refer this container elsewhere
# e.g inside nginx container
FROM node:12.22.1-alpine3.12
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
RUN yarn
#build the project for production
RUN yarn build

##############################
# Build the NGINX-build image.
FROM alpine:3.11
ARG NGINX_VERSION=1.15.1
ARG NGINX_RTMP_VERSION=1.2.1

ARG FFMPEG_VERSION=earshot-v0.1

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

# Get FFmpeg source.
RUN cd /tmp/ && \
  wget https://github.com/EnvelopSound/ffmpeg/archive/${FFMPEG_VERSION}.tar.gz && \
  tar zxf ${FFMPEG_VERSION}.tar.gz && rm ${FFMPEG_VERSION}.tar.gz

# Compile ffmpeg.
RUN cd /tmp/FFmpeg-${FFMPEG_VERSION} && \
   ./configure \
   --enable-version3 \
   --enable-gpl \
   --enable-nonfree \
   --enable-small \
   --enable-libx264 \
   --enable-libopus \
   --disable-debug \
   --disable-doc \
   --disable-ffplay \
   --extra-cflags="-I${PREFIX}/include" \
   --extra-ldflags="-L${PREFIX}/lib" \
   --extra-libs="-lpthread -lm" \
   --prefix="${PREFIX}" && \
    make && make install && make distclean

#COPY /tmp/FFmpeg-${FFMPEG_VERSION}/build/ffmpeg /usr/local/bin/

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
