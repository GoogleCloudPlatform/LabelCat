# LabelCat [![Build Status](https://img.shields.io/circleci/project/github/GoogleCloudPlatform/LabelCat/master.svg?style=flat-square&logo=circleci)](https://circleci.com/gh/GoogleCloudPlatform/LabelCat/tree/master) [![Test Coverage](https://img.shields.io/coveralls/github/GoogleCloudPlatform/LabelCat/master.svg?branch=master&service=github&style=flat-square)](https://coveralls.io/github/GoogleCloudPlatform/LabelCat?branch=master) [![License](https://img.shields.io/github/license/GoogleCloudPlatform/LabelCat.svg?style=flat-square)](https://github.com/GoogleCloudPlatform/LabelCat)

## Note: LabelCat is in development.

_Disclaimer: This is not an official Google product._

Organizing the issues in your GitHub repositories can be a different kind of
animal, that's why you need LabelCat.

## Installation

### Clone and setup

1.  Install Node.js >= 8.x
1.  `git clone https://github.com/GoogleCloudPlatform/LabelCat`
1.  `cd LabelCat`
1.  `npm install`
1.  `npm link .`
1.  `cp defaultsettings.json settings.json` (`settings.json` is where you
    customize the app)
1.  Modify `settings.json` as necessary.

### Configure your project environment

1.  In the GCP Console, go to the Manage Resources page and select or create a
    new project:

    [Go to the Manage Resources Page](https://console.cloud.google.com/cloud-resource-manager?_ga=2.144772156.-906058837.1536100239)

1.  Update `settings.json` to include your GCP Project ID and Compute Region.

1.  Make sure that billing is enabled for your project:

    [Learn How to Enable Billing](https://cloud.google.com/billing/docs/how-to/modify-project)

1.  Enable the AutoML Natural Language APIs.

    [Enable the APIs](https://console.cloud.google.com/flows/enableapi?apiid=storage-component.googleapis.com,automl.googleapis.com,storage-api.googleapis.com&redirect=https://console.cloud.google.com&_ga=2.249562766.-906058837.1536100239)

1.  [Install the gcloud command line tool.](https://cloud.google.com/sdk/downloads#interactive)

1.  Follow the instructions to create a service account and download a key file.

    [Create Account and Download Key File](https://cloud.google.com/iam/docs/creating-managing-service-accounts#creating_a_service_account)

1.  Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the path to
    the Service Account key file that you downloaded when you created the
    Service Account. For example:

        export GOOGLE_APPLICATION_CREDENTIALS=key-file

1.  Give your new Service Account the AutoML Editor IAM role with the following
    commands:

        gcloud auth login
        gcloud config set project YOUR_PROJECT_ID
        gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
            --member=serviceAccount:SERVICE_ACCOUNT_NAME \
            --role='roles/automl.editor'

    replacing `YOUR_PROJECT_ID` with your GCP project ID and
    `SERVICE_ACCOUNT_NAME`with the name of your new Service Account, for example `service-account1@myproject.iam.gserviceaccount.com`.

1.  Allow the AutoML Natural Language service accounts to access your Google
    Cloud project resources:

        gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
            --member="serviceAccount:custom-vision@appspot.gserviceaccount.com" \
            --role="roles/storage.admin"

    replacing `YOUR_PROJECT_ID` with your GCP project ID.

1.  Create a Google Cloud Storage bucket to store the documents that you will
    use to train your custom model. The bucket name must be in the format:
    `YOUR_PROJECT_ID-lcm`. Runy the following command to create a bucket in the
    `us-central1` region:

        gsutil mb -p YOUR_PROJECT_ID -c regional -l `us-central1` gs://YOUR_PROJECT_ID-lcm/

    replacing `YOUR_PROJECT_ID` with your GCP project ID.

## Usage

Run `labelcat --help` for usage information.

    labelcat <command>

    Commands:
      labelcat retrieveIssues <repoDataFilePath>                    Retrieves issues from a .txt file of gitHub
      <issuesDataFilePath>                                          repositories.
      labelcat createDataset <datasetName>                          Create a new Google AutoML NL dataset with the specified
                                                                    name.
      labelcat importData <issuesDataPath> <datasetId>              Import the GitHub issues data from Google Cloud Storage
                                                                    bucket into the Google AutoML NL dataset by specifying
                                                                    the file's path in the bucket and the dataset ID.

    Options:
      --version  Show version number                                                                               [boolean]
      --help     Show help                                                                                         [boolean]

    Examples:
      labelcat retrieveIssues repoData.txt issuesData.csv           Retrieves issues from list of repos in repoData.txt and
                                                                    saves the resulting information to issuesData.csv.
      labelcat createDataset Data                                   Creates a new multilabel dataset with the specified
                                                                    name.
      labelcat importData gs://myproject/mytraindata.csv            Imports the GitHub issues data into the dataset by
      1248102981

### Retrieve Issues

1.  Create a `repos.txt` file with a single column list of GitHub repositories from
    which to collect issue data. The format should be `:owner/:repository`:

    Example:

        GoogleCloudPlatform/google-cloud-node
        GoogleCloudPlatform/google-cloud-java
        GoogleCloudPlatform/google-cloud-python

1.  From the project folder, run the retrieveIssues command with the path of the
    repository list file and path to a location to save the resulting `.csv`
    file:

    Example:

        labelcat retrieveIssues repos.txt issues.csv

1.  Upload the resulting .csv file to your Google Cloud Storage Bucket:

    Example:

        gsutil cp repos.txt gs://YOUR_PROJECT_ID-lcm/

    replacing `YOUR_PROJECT_ID` with your GCP project ID.

### Create Dataset

1.  From the project folder, run the createDataset command with the name of the
    dataset to create.

    Example:

        labelcat createDataset TestData

### Import Data

1.  Run importData using the Dataset ID returned by the createDataset command
    and the URI to the issue data `.csv` file.

    Example:

        labelcat importData gs://YOUR_PROJECT_ID-lcm/issues.csv 123ABCD456789

    replacing `YOUR_PROJECT_ID` with your GCP project ID.

## Contributing

See [CONTRIBUTING][3].

## License

Copyright 2018, Google, Inc.

Licensed under the Apache License, Version 2.0

See [LICENSE][4].

[1]: https://github.com/jmdobry
[2]: https://cloud.google.com/sdk/
[3]: https://github.com/GoogleCloudPlatform/LabelCat/blob/master/CONTRIBUTING.md
[4]: https://github.com/GoogleCloudPlatform/LabelCat/blob/master/LICENSE
