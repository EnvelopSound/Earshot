# Earshot -- Envelop Ambisonic RTMP Streaming Higher-Order Transcoder  #

![CI](https://github.com/EnvelopSound/Earshot/workflows/CI/badge.svg)

![Earshot Screenshot](/Screenshot.png?raw=true "Earshot Screenshot")

Envelop Ambisonic RTMP Streaming Higher-Order Transcoder (Earshot) is a containerized multichannel RTMP->DASH transcoder, based on ngnix. Earshot can be used to transcode higher-order Ambisonics and other multichannel live streams for the web.

## About Envelop ##

[Envelop](http://envelop.us) is a nonprofit organization that amplifies the connective power of music through immersive listening spaces and open source spatial audio software. Three-dimensional experiences of sound and music bring people together, catalyzing shared moments of inspiration, empathy and wonder.

* [Join the Envelop Tools Facebook Group for questions, tips, etc.](https://www.facebook.com/groups/E4LUsers)
* Help support Envelop, and our open-source software development, [through a membership or donation](https://www.envelop.us/membership-donations).

## Motivation for Earshot ##

Tools such as [Envelop for Live](https://www.envelop.us/software) have made it easy for musicians to compose and perform ambisonic content.  However, there remain limited options for live streaming ambisonic content, particularly beyond first order. Ambisonic live streaming has applications for VR/AR/XR and immersive home listening experiences.

Earshot can be used in combination with pkviet's [OBS Studio Music Edition](https://github.com/pkviet/obs-studio/releases/) which supports multichannel AAC encoding up to 16.0. For more information on OBS see [obsproject.com](https://obsproject.com).

Earshot is designed to be easily deployed to a cloud-based hosting solution, such as AWS ECS, DigitalOcean, etc.

Earshot is GPL licensed, as it uses ffmpeg binaries compiled with GPL codecs including libx264.

## Features ##

* Live stream up to 255 audio channels (i.e. up to 14th Order Ambisonics) with optional video
* Web interface for stream monitoring and debuggging
* Preview and test different Dash.js client player settings
* RTMP stream authentication
* Custom FFmpeg flags for versatility

## Key Technologies Used ##

* [NGINX RTMP Module](https://github.com/arut/nginx-rtmp-module) which runs the transcoding and DASH-serving HTTP server
* [Docker](https://www.docker.com/)
* [pkviet's](https://github.com/pkviet) pce2 fork of [FFmpeg](https://github.com/pkviet/FFmpeg) which supports decoding PCE headers in AAC-encoded RTMP streams
* pkviet's [OBS Studio Music Edition](https://github.com/pkviet/obs-studio/releases/) which supports encoding 16.0 RTMP streams
* [Opus](https://github.com/xiph/opus), the audio codec used in combination with DASH
* [MPEG-DASH](https://en.wikipedia.org/wiki/Dynamic_Adaptive_Streaming_over_HTTP), an adaptive bitrate HTTP streaming solution
* [Dash.js](https://github.com/Dash-Industry-Forum/dash.js), a Javascript client for DASH stream playback
* [React](https://reactjs.org/) and [Create React App](https://github.com/facebook/create-react-app) for Webtools

## Known Limitations ##

* Some browsers, such as some versions of Safari, do not support Opus, and will not play any sound.
* During the initial 60 seconds of a DASH stream, Dash.js can throw errors and Webtools may need to be reloaded. This issue requires further investigation.

## Running Earshot Locally ##

### Requirements: ###

* [Docker Desktop](https://www.docker.com/products/docker-desktop)
* [Git](https://git-scm.com/)
* [Git LFS](https://git-lfs.github.com/)

#### Optional Requirements: ####

* [OBS Studio Music Edition](https://github.com/pkviet/obs-studio/releases/) -- recommended to easily stream from your computer
* [FFmpeg](https://ffmpeg.org/) installed locally for command-line RTMP streaming
* [Yarn](https://classic.yarnpkg.com/en/) for developing Webtools locally
* [Loopback](https://rogueamoeba.com/loopback/) for streaming from Ableton Live or other audio software

To generate a multichannel audio stream in a format such as third-order AMBIX you can use any of the following:

* Ableton Live 10 Studio with [Envelop for Live](https://www.envelop.us/software) installed
* An example AMBIX-encoded 16 channel WAV file included in the `tester/resources` directory` streamed with FFmpeg
* Any other DAW or software that can produce a multichannel stream

### Setup with OBS: ###

**1. Build and run the Docker container for the transcoder**

From this (project root) directory:

    docker-compose up --build nginx-rtmp

**2. Open OBS Music Edition**

Click Settings and set the following:

**Stream**

* Service: **Custom...**
* Server: **rtmp://127.0.0.1:1935/live**
* Stream Key: **stream1**
* Use authentication: unchecked

**Output**

* Under the Audio tab, select Audio Bitrate: **1024** or another number appropriate for your application. Divide this number by the number of channels to get the per-channel bitrate, i.e. 1024kbps with 16 channels = 64kbps per channel)

**Audio**

* Channels: **16.0** for third order, **9.0** for second order, etc. This must match your source audio.

**3. Select Audio Source**

* If you are streaming via Envelop for Live or another DAW via Loopback or Jack, add an Audio Input Capture under Sources with the appropriate Device. Once you start playing audio in your DAW, audio should show up under this device in the Input Mixer
* If you are simply testing, add a Media Source under Sources and select the `resources/16chambixloop.wav` file with **Loop** checked. You should now see audio under the Media Source in the Input Mixer.

**4. Start Streaming**

Click **Start Streaming** in OBS

Your Dash stream is now available under http://localhost/stream1.mpd

DASH stream webtools are available under http://localhost/webtools

### RTMP Authentication ###

To add a RTMP auth secret token you can update the "RTMP_AUTH_TOKEN" environment variable in the docker-compose.yml file, e.g. ```- RTMP_AUTH_TOKEN=my_secret```

On your streaming client, appent the secret using the ```token``` GET parameter to the request.

* With ffmpeg: ```ffmpeg -y -stream_loop -1 -i tester/resources/16chambixloop.wav -af "channelmap=channel_layout=hexadecagonal" -c:a aac -ac 16 -b:a 2048k -f flv "rtmp://127.0.0.1:1935/live/stream1?token=my_secret"```
* With OBS: your **Stream Key** should be appended with ```?token=my_secret```. If the stream name is stream1, Stream Key should be ```stream1?token=my_secret```

### FFMPEG Flags ###

If you want to add additional flags for ffmpeg that is called within the transcoder -- for example, more adaptive DASH stream bitrates -- you can update the "FFMPEG_FLAGS" environment variable in the docker-compose.yml.

## Using Webtools ##

Load http://localhost/webtools in your browser to monitor and debugs streams from the transcoder. Chrome or Firefox preferred.

To test different [Dash.js Player settings](http://cdn.dashjs.org/latest/jsdoc/module-Settings.html#~PlayerSettings__anchor), edit the JSON in the Dash.js settings box. Any changes applied will affect the live stream on your browser in real time, or reload the new URL -- containing the encoded  settings as a parameter -- to test the player settings loaded initially on page load.

Known Webtools issues:

* Some versions of Safari do not support Opus, so sound will not load.
* Loading Webtools within the first minute after the start of the live stream may cause errors due to missing segments.
* If you are using an audio-only stream, FFmpeg's -window_size flag may cause problems. It is recommended not to use the -window_size flag for audio-only streams.

## Deploying Earshot to AWS CloudFormation ##

Earshot can be easily deployed to AWS using [AWS CLI](https://aws.amazon.com/cli/) and CloudFormation. You can customize the deployment configuration in the CloudFormation template files in the `templates/` directory

#### Deploy Earshot stack

```
aws cloudformation create-stack --region=us-west-2 --stack-name earshot-stack --template-body file://templates/cloudformation-template.yaml --parameters ParameterKey=InstanceType,ParameterValue=t2.micro ParameterKey=KeyName,ParameterValue=ecs-test --capabilities CAPABILITY_IAM
```

### Access Earshot public URL ###

To get the public URL of your Earshot instance

1. Go to AWS Console -> ECS
2. Open cluster named earshot-stack-EcsCluster
* note: full cluster name may appear be longer. For example: earshot-stack-EcsCluster-o3KvtIz8VmTt
3. Open the "ECS Instances" tab
5. Click into the first ECS instance
6. Copy the "Public IP" field

#### RTMP Access

This is the stream URL you should use for OBS or whichever live streaming application you are using at the source, e.g.: `rtmp://<ExternalIp>:1935/live/stream1`

#### Webtools Access

To access the webtools please use URL 

```
http://<ExternalIp>/webtools
```
### Custom FFmpeg flags and RTMP auth ###

Set these environmental values in the service-ec2-public-vpc.yml file under Resources->TaskDefinition->Properties->ContainerDefinitions->Environment.
