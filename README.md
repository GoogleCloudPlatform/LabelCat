# LabelCat

Disclaimer: This is not an official Google product.

Organizing the issues in your GitHub repositories can be a different kind of animal, that's why you need LabelCat.

LabelCat is a NodeJS app that uses Google's Prediction API to automatically label GitHub Issues as they are created. Who taught LabelCat this trick you ask? You did...or rather, you will. Once deployed, you must train LabelCat on previously labeled issues, preferably from a variety of well-labeled repositories.

While the instructions in this guide show how to deploy LabelCat to the Google Cloud Platform for maximum ease-of-use and scalability, LabelCat can be deployed virtually anywhere.

Built by @jmdobry

## Table of Contents

- [What's included](#whats-included)
- [Installation](#installation)
- [Deployment](#deployment)

## What's included

- A NodeJS backend + worker
- An Angular + Material UI frontend
- Deployment instructions
- Detailed documentation of every piece

As an exercise, try swapping out the backend or frontend with something you write yourself.

## Installation

### Clone and setup

1. Install Node.js >= 4.x
1. `git clone https://github.com/GoogleCloudPlatform/LabelCat`
1. `cd LabelCat`
1. `npm install`
1. `cp config.default.js config.js` (`config.js` is where you customize the app)
1. Modify `config.js` as necessary.

### Register Developer Application on GitHub

LabelCat uses GitHub OAuth to authenticate users. Create an _individual_ developer application if you intend to use LabelCat on repositories owned by your GitHub user. Create an _organization_ developer application if you intend to use LabelCat on repositories owned by an organization that you administer.

_Individual_ Application: Go to https://github.com/settings/developers to register a new individual application.

_Organization_ Application: Go to `https://github.com/organizations/<organization>/settings/applications/new`. Replace `<organization>` with the name of your organization.

__Register the Application__:

1. Click "Register new application"
1. Enter application name, e.g. `Foo LabelCat`
1. Enter homepage URL, e.g. `https://labelcat.appspot.com/`
1. Optionally enter application description
1. Enter authorization callback URL, e.g. `https://labelcat.appspot.com/auth/github/callback`
1. Click "Register application"
1. Copy the generated `Client ID` and `Client Secret` into the `config.js` file that you created earlier

### Register for Google Cloud Platform

The Google Cloud Platform provides a $300 free trial for new accounts, enough to run the app for a long time (TODO: update for accuracy).

1. Register: https://console.developers.google.com/freetrial
1. Create a new Project
1. Enable the Predictions API, Datastore API and PubSub API for your new project
1. Go to "Credentials", create a new Service Account and download the generated key file

## Deployment

1. Install the [Google Cloud SDK](https://cloud.google.com/sdk/)
1. `gcloud preview app deploy app.yaml worker.yaml --set-default`

## Contributing

See [CONTRIBUTING](https://github.com/GoogleCloudPlatform/LabelCat/blob/master/CONTRIBUTING.md).

## License

Copyright 2015, Google, Inc.

Licensed under the Apache License, Version 2.0

See [LICENSE](https://github.com/GoogleCloudPlatform/LabelCat/blob/master/LICENSE).
