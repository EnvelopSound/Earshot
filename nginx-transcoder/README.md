# ECR building

1. ECR login

```
aws ecr get-login-password --region us-west-1 | docker login --username AWS --password-stdin 886249805331.dkr.ecr.us-west-1.amazonaws.com
```

2. build image

```
docker build --network=host -t rtmp .
```

3. push image

```
docker tag rtmp:latest 886249805331.dkr.ecr.us-west-1.amazonaws.com/rtmp:latest
docker push 886249805331.dkr.ecr.us-west-1.amazonaws.com/rtmp:latest
```