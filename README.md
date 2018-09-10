# LabelCat [![Build Status](https://travis-ci.org/GoogleCloudPlatform/LabelCat.svg)](https://travis-ci.org/GoogleCloudPlatform/LabelCat) [![Test Coverage](https://coveralls.io/repos/GoogleCloudPlatform/LabelCat/badge.svg?branch=master&service=github)](https://coveralls.io/github/GoogleCloudPlatform/LabelCat?branch=master)

## Note: LabelCat uses the Cloud Prediction API, which has since [been deprecated](https://cloud.google.com/prediction/) in favor of [AutoML Natural Language](https://cloud.google.com/natural-language/automl/docs/).

_Disclaimer: This is not an official Google product._

Organizing the issues in your GitHub repositories can be a different kind of
animal, that's why you need LabelCat.

LabelCat is a NodeJS app that uses Google's Prediction API to automatically
label GitHub Issues as they are created. Who taught LabelCat this trick you
ask? You did...or rather, you will. Once deployed, you must train LabelCat on
previously labeled issues, preferably from a variety of well-labeled
repositories.

These instructions show how to run LabelCat on Google Cloud Managed VMs for
maximum ease-of-use and scalability, but LabelCat can be deployed virtually
anywhere.

While many Google Cloud Platform Node.js samples are small and simple, focusing
on a single concept or piece of functionality, there aren't many full-blown
Node.js apps to look at and tinker with. LabelCat fills the void somewhat by
showcasing a larger Node.js app that addresses a number of production concerns.
As such LabelCat is an excellent resource as you build your own production
Node.js applications on Google Cloud Platform.

Built by [@jmdobry][1]

## Table of Contents

- [What's included](#whats-included)
- [Installation](#installation)
- [Deployment](#deployment)

## What's included

- A NodeJS Web API + worker
- An Angular + Material UI frontend
- Deployment instructions
- Detailed documentation of every piece

As an exercise, try swapping out the backend or frontend with something you
write yourself.

## Installation

### Clone and setup

1. Install Node.js >= 4.x
1. `git clone https://github.com/GoogleCloudPlatform/LabelCat`
1. `cd LabelCat`
1. `npm install`
1. `cp config.default.js config.js` (`config.js` is where you customize the app)
1. Modify `config.js` as necessary.

### Register Developer Application on GitHub

LabelCat uses GitHub OAuth to authenticate users. Create an _individual_
developer application if you intend to use LabelCat on repositories owned by
your GitHub user. Create an _organization_ developer application if you intend
to use LabelCat on repositories owned by an organization that you administer.

_Individual_ Application: Go to https://github.com/settings/developers to
register a new individual application.

_Organization_ Application: Go to
`https://github.com/organizations/<organization>/settings/applications/new`.
Replace `<organization>` with the name of your organization.

__Register the Application__:

1. Click "Register new application"
1. Enter application name, e.g. `Foo LabelCat`
1. Enter homepage URL, e.g. `https://labelcat.appspot.com/`
1. Optionally enter application description
1. Enter authorization callback URL, e.g.
`https://labelcat.appspot.com/auth/github/callback`
1. Click "Register application"
1. Copy the generated `Client ID` and `Client Secret` into the `config.js` file
that you created earlier

### Register for Google Cloud Platform

The Google Cloud Platform provides a $300 free trial for new accounts, enough to
run the app for a "long time" (TODO: Update for accuracy). 

1. Register at https://console.developers.google.com/freetrial
1. Create a new Project
1. Enable the Predictions API, Datastore API and PubSub API for your new project
1. Go to "Credentials", create a new Service Account and download the generated
key file

## Deployment

1. Install the [Google Cloud SDK][2]
1. `gcloud app deploy app.yaml worker.yaml --promote`

## Contributing

See [CONTRIBUTING][3].

## License

Copyright 2015, Google, Inc.

Licensed under the Apache License, Version 2.0

See [LICENSE][4].

[1]: https://github.com/jmdobry
[2]: https://cloud.google.com/sdk/
[3]: https://github.com/GoogleCloudPlatform/LabelCat/blob/master/CONTRIBUTING.md
[4]: https://github.com/GoogleCloudPlatform/LabelCat/blob/master/LICENSE
