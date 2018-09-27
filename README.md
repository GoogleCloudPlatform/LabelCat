# LabelCat [![Build Status](https://travis-ci.org/GoogleCloudPlatform/LabelCat.svg)](https://travis-ci.org/GoogleCloudPlatform/LabelCat) [![Test Coverage](https://coveralls.io/repos/GoogleCloudPlatform/LabelCat/badge.svg?branch=master&service=github)](https://coveralls.io/github/GoogleCloudPlatform/LabelCat?branch=master)

## Note: LabelCat is in development.

_Disclaimer: This is not an official Google product._

Organizing the issues in your GitHub repositories can be a different kind of
animal, that's why you need LabelCat.

## Installation

### Clone and setup

1. Install Node.js >= 4.x
1. `git clone https://github.com/GoogleCloudPlatform/LabelCat`
1. `cd LabelCat`
1. `npm install`
1. `npm link`
1. `cp defaultsettings.json settings.json` (`settings.json` is where you customize the app)
1. Modify `settings.json` as necessary.

### Configure your project environment

1. In the GCP Console, go to the Manage resources page and select or create a new project.
   * [Go to the Manage Resources Page](https://console.cloud.google.com/cloud-resource-manager?_ga=2.144772156.-906058837.1536100239)
1. Update settings.json to include your GCP Project ID and Compute Region.
1. Make sure that billing is enabled for your project.
   * [Learn How to Enable Billing](https://cloud.google.com/billing/docs/how-to/modify-project)
1. Enable the AutoML Natural Language APIs.
   * [Enable the APIs](https://console.cloud.google.com/flows/enableapi?apiid=storage-component.googleapis.com,automl.googleapis.com,storage-api.googleapis.com&redirect=https://console.cloud.google.com&_ga=2.249562766.-906058837.1536100239)
1. [Install the gcloud command line tool.](https://cloud.google.com/sdk/downloads#interactive)
1. Follow the instructions to create a service account and download a key file.
   * [Create Account and Download Key File](https://cloud.google.com/iam/docs/creating-managing-service-accounts#creating_a_service_account)
1. Set the GOOGLE_APPLICATION_CREDENTIALS environment variable to the path to the service account key file that you downloaded when you created the service account. For example:
    ```
    export GOOGLE_APPLICATION_CREDENTIALS=key-file
    ```
1. Add your new service account to the AutoML Editor IAM role with the following commands. Replace project-id with the name of your GCP project and replace service-account-name with the name of your new service account, for example service-account1@myproject.iam.gserviceaccount.com.
    ```
    gcloud auth login
     gcloud config set project project-id
     gcloud projects add-iam-policy-binding project-id \
       --member=serviceAccount:service-account-name \
       --role='roles/automl.editor'
    ```
1. Allow the AutoML Natural Language service accounts to access your Google Cloud project resources:
    ```
    gcloud projects add-iam-policy-binding project-id \
    --member="serviceAccount:custom-vision@appspot.gserviceaccount.com" \
    --role="roles/storage.admin"
    ```
1. Create a Google Cloud Storage bucket to store the documents that you will use to train your custom model. The bucket name must be in the format: $PROJECT_ID-lcm. The following command creates a storage bucket in the us-central1 region named $PROJECT_ID-lcm:
    ```
    gsutil mb -p $PROJECT_ID -c regional -l $REGION_NAME gs://$PROJECT_ID-lcm/
    ```
    Example:
    ```
    gsutil mb -p example-project -c regional -1 us-central1 gs://example-project-lcm/
    ```
## Usage
### Retrieve Issues
1. Create a .txt file with a single column list of GitHub repositories from which to collect issue data. The format should be ```:owner/:repository```

   Example:
   ```
   GoogleCloudPlatform/google-cloud-node
   GoogleCloudPlatform/google-cloud-java
   GoogleCloudPlatform/google-cloud-python
   ```
1. From the project folder, run the retrieveIssues command with the path of the repository list file and path to a location to save the resulting .csv file.

    Example: ``` labelcat retrieveIssues repos.txt issues.csv ```
1. Upload the resulting .csv file to your Google Cloud Storage Bucket:

    ```gsutil cp [LOCAL_OBJECT_LOCATION] gs://[DESTINATION_BUCKET_NAME]/ ```

### Create Dataset
1. From the project folder, run the createDataset command with the name of the dataset to create.

    Example: ```labelcat createDataset TestData```

### Import Data
1. Run importData using the Dataset ID returned by the createDataset command and the URI to the issue data .csv

     Example: ```labelcat importData gs://example-project-lcm/issues.csv 123ABCD456789```

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
