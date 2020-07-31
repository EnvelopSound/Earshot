# Earshot -- Envelop Ambisonic RTMP Streaming Higher-Order Transcoder  #

Envelop Ambisonic RTMP Streaming Higher-Order Transcoder (Earshot) is a containerized multichannel ngnix RTMP->DASH transcoder, used to transcode higher-order Ambisonics and other multichannel livestreams for the web.

Earshot is based on [pkviet's](https://github.com/pkviet) forks of [FFmpeg](https://github.com/pkviet/FFmpeg) and [OBS](https://github.com/pkviet/obs-studio) which enable AAC encoding and decoding for up to 16 channels.

Earshot is GPL licensed, as it uses ffmpeg binaries compiled with GPL codecs including libx264.

## Motivation ##

Tools such as [Envelop for Live](https://www.envelop.us/software) have made it easy for musicians to compose and perform ambisonic content.  However, there remain limited options for livestreaming ambisonic content, particularly beyond first order. Ambisonic livestreaming has applications for VR/AR/XR and immersive home listening experiences.

Earshot can be used in combination with pkviet's [OBS Studio Music Edition](https://github.com/pkviet/obs-studio/releases/) which supports multichannel AAC encoding up to 16.0. For more information on OBS see [obsproject.com](https://obsproject.com).

Earshot is designed to be easily deployed to a cloud-based hosting solution, such as AWS ECS, DigitalOcean, etc.

## Key Technologies Used ##

* [NGINX RTMP Module](https://github.com/arut/nginx-rtmp-module) which runs the transcoding and DASH-serving HTTP server
* [Docker](https://www.docker.com/)
* [pkviet's](https://github.com/pkviet) pce2 fork of [FFmpeg](https://github.com/pkviet/FFmpeg) which supports decoding PCE headers in AAC-encoded RTMP streams
* pkviet's [OBS Studio Music Edition](https://github.com/pkviet/obs-studio/releases/) which supports encoding 16.0 RTMP streams
* [Opus](https://github.com/xiph/opus), the audio codec used in combination with DASH
* [MPEG-DASH](https://en.wikipedia.org/wiki/Dynamic_Adaptive_Streaming_over_HTTP), an adaptive bitrate HTTP streaming solution
* [dash.js](https://github.com/Dash-Industry-Forum/dash.js), a Javascript client for DASH stream playback
* [Create React App](https://github.com/facebook/create-react-app) for Webtools

## Known Limitations ##

Some browsers, such as some versions of Safari, do not support Opus.

## Running Earshot locally ##

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

1. Build and run the Docker container for the transcoder

From this (project root) directory:

    docker-compose up --build nginx-rtmp

2. Open OBS Music Edition

Click Settings and set the following:

#### Stream ####
* Service: **Custom...**
* Server: **rtmp://127.0.0.1:1935/live**
* Stream Key: **stream1**
* Use authentication: unchecked

#### Output ####

* Under the Audio tab, select Audio Bitrate: **1024** or another number appropriate for your application. Divide this number by the number of channels to get the per-channel bitrate, i.e. 1024kbps with 16 channels = 64kbps per channel)

#### Audio ####

* Channels: **16.0** for third order, **9.0** for second order, etc. This must match your source audio.

3. Select Audio Source

* If you are streaming via Envelop for Live or another DAW via Loopback or Jack, add an Audio Input Capture under Sources with the appropriate Device. Once you start playing audio in your DAW, audio should show up under this device in the Input Mixer
* If you are simply testing, add a Media Source under Sources and select the `resources/16chambixloop.wav` file with **Loop** checked. You should now see audio under the Media Source in the Input Mixer.

4. Start Streaming

Click **Start Streaming** in OBS

Your Dash stream is now available under http://localhost/stream1.mpd

DASH stream webtools are available under http://localhost/webtools

#### RTMP Authentication ####

To add a RTMP auth secret token you can update the "RTMP_AUTH_TOKEN" environment variable in the docker-compose.yml file, e.g. ```- RTMP_AUTH_TOKEN=my_secret```

On your streaming client, appent the secret using the ```token``` GET parameter to the request.

* With ffmpeg: ```ffmpeg -y -stream_loop -1 -i tester/resources/16chambixloop.wav -af "channelmap=channel_layout=hexadecagonal" -c:a aac -ac 16 -b:a 2048k -f flv "rtmp://127.0.0.1:1935/live/stream1?token=my_secret"```
* With OBS: your **Stream Key** should be appended with ```?token=my_secret```. If the stream name is stream1, Stream Key should be ```stream1?token=my_secret```

#### FFMPEG Flags ####

If you want to add additional flags for ffmpeg that is called within the transcoder -- for example, more adaptive DASH stream bitrates -- you can update the "FFMPEG_FLAGS" environment variable in the docker-compose.yml.

## Deploying Earshot to AWS ECS ##

You can easily deploy Earshot to run on AWS ECS.

#### Install AWS CLI Tools ####

To deploy the containers on ECS you will need to install official AWS CLI tools.

- [AWS CLI](https://aws.amazon.com/cli/)
- [ECS CLI Tools](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_CLI_installation.html)

#### Create EC2 role ####

You will need to create an IAM role so that ECS CLI can create resources on your behalf.

your new IAM role should have the following permissions:

- AmazonECS_FullAccess

to create an EC2 role, please refer to [IAM roles for Amazon EC2 - Amazon Elastic Compute Cloud](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html)

once you have created your IAM role, please copy the role name as you will need it later.

#### Create Security Group ####

Our ECS cluster will need to be configured to allow inbound traffic from HTTP and RTMP ports. To allow our ECS cluster to accept TCP traffic we will need to create a new EC2 security group.

To learn how to create a new security group, please see: [Creating, configuring, and deleting security groups for Amazon EC2 - AWS Command Line Interface](https://docs.aws.amazon.com/cli/latest/userguide/cli-services-ec2-sg.html)

In your security group please add the following settings:

```
Name: ECSEarshotSecurity
Description: (blank)
VPC: (any)
```

Inbound rules:

```
Type: Custom TCP
Protocol: TCP
Port Range: 1935
Source: 0.0.0.0/0
```

```
Type: Custom TCP
Protocol: TCP
Port Range: 80
Source: 0.0.0.0/0
```

```
Type: Custom TCP
Protocol: TCP
Port Range: 443
Source: 0.0.0.0/0
```

#### Deploy on ECS ####

1. Configure ECS CLI

```
ecs-cli configure profile --access-key xxx --secret-key xxx
```

2. Create new ECS cluster

```
ecs-cli configure --cluster your-cluster-name --default-launch-type EC2 --region some-aws-region
```

3. Provision the cluster

```
ecs-cli up --instance-role your-ec2-instance-role --security-group ECSEarshotSecurity
```

4. Build and deploy the container

```
ecs-cli compose --file docker-compose.ecs.yml up
```

## Local Development ##

To develop the Webtools React application:

* Run the Webtools app with yarn:

```
cd webtools
yarn
yarn start
```

* Comment the production ```/webtools``` route and uncomment the local development ```/webtools``` route in ```nginx-rtmp/nginx.conf``` to proxy http://localhost/webtools requests to the React app running on port 3000. Now you can develop with all the benefits of Webpack hot reloading!

Note: the default browser tab that yarn spawns (http://localhost:3000/webtools) will not work, since it looks for DASH files and nginx stats with a relative URL.  Use http://localhost/webtools.

### Testing ###

The ```rtmp-tester``` container spawns the nginx transcoder, uses ffmpeg to stream a 16 channel WAV file via RTMP, and checks for the presence of a DASH manifest file. To run it:

```
docker-compose up --build rtmp-tester
```


### Deploy using AWS CloudFormationg ###


#### 1. Deploy EC2 stack

```
aws cloudformation create-stack --stack-name earshot-stack-ec2 --region us-west-2 --template-body file://templates/cluster-ec2-public-vpc.yml --parameters ParameterKey=EnvironmentName,ParameterValue=production ParameterKey=KeyPair,ParameterValue=your-aws-keypair --capabilities CAPABILITY_IAM
```


#### 2. Deploy ALB stack

```
aws cloudformation create-stack --stack-name earshot-stack-alb --region us-west-2 --template-body file://templates/alb-external.yml --parameters ParameterKey=EnvironmentName,ParameterValue=production --capabilities CAPABILITY_IAM
```

#### 3. Deploy ECS stack

```
aws cloudformation create-stack --stack-name earshot-stack-ecs --region us-west-2 --template-body file://templates/service-ec2-public-lb.yml --parameters ParameterKey=EnvironmentName,ParameterValue=production --capabilities CAPABILITY_IAM
```

### Access ALB public URL ###

To get the public URL of your application load balancer:

1. Login to AWS Console
2. Goto CloudFormation
3. Click "earshot-stack-alb" stack
4. Click "Outputs" tab
5. Copy "ExternalUrl"
