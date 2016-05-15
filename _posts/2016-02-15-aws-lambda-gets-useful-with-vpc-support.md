---
layout: post
title:  "AWS Lambda Gets Useful with VPC support"
date:   2016-02-15 12:00:00 -0400
categories: AWS
---

OK, so this post's title is a bit harsh, but AWS Lambda has added something
*really* great.

To back up, Lambda is a service offered by AWS as a means of running code
without jumping head first into full blown EC2 instances or Containers. They can
do some very interesting things, such as using them as responses to AWS API
Gateways, etc.

Previously, there was one big hurdle to using Lambda for us. You couldn't place
them inside of a VPC. This means that whatever Lambda is accessing had to be
publicly accessible. Most of our infrastructure is private within the VPC, and
you couldn't access it from the outside. Moreover, we didn't want to make it
accessible from the outside.

There was a thread on the AWS Forums about this, and AWS listened. You can now
place a Lambda function inside of a VPC. More importantly, you can assign them
in to security groups.

The use for this is very interesting to us, as, now we can use it without
exposing things to the outside we didn't want to. One interesting case might be
to act as a cron job. If you want something to run periodically, but don't want
to worry about where that cron job lives, Lambda is a good place to start.

As an example, we may want to periodically run optimize on our SOLR cluster.
Well, with Lambda, we can now do that.

We have a simple node.js script that hits our SolrCloud cluster with a GET
request to http://internal-solr-cluster:8983/solr/ourcollection/update?optimize=true.

Previously, as a Lambda function, it would not have been able to access the
internal-solr-cluster Elastic Load Balancer. Once we assigned it to a VPC,
placed it in the right security groups, and specified a CloudWatch Event to run
on a schedule of once a week, we now have our SOLR collection getting optimized
once a week without having to worry where the optimization runs from.