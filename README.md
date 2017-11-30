# sfdx-hydrate

This is a plugin to help create new SFDX projects from existing Salesforce orgs. The ultimate goal is to run an `sfdx hydrate:project` command, and produce an SFDX project from an existing orgs metadata.

## Creating a scratch file from a source org

The first feature built towards this goal is creating a scratch file. Salesforce is piloting an org shape feature, but I'm impatient and could get 90% of the way there without it.

The only missing piece from the resulting scratch org is the features list. I'm working on it.

Run the command:

```
$ sfdx hydrate:scratchfile -u <username|alias>`
```

This will produce a JSON string in the command line that can be copied to a scratch org file.

example output:

```
{
  "orgName": "Wayne Enterprises",
  "edition": "Enterprise",
  "description": "Created by the sfdx-hydrate plugin",
  "features": [],
  "orgPreferences": {
    "enabled": [
      "IsCascadeActivateToRelatedPricesEnabled",
      "IsQuantityScheduleEnabled",
      "IsRevenueScheduleEnabled",
      "IsQuoteEnabled",
      ... 
    ],
    "disabled": [
      "IsMiddleNameEnabled",
      "IsNameSuffixEnabled",
      "IsMarketingActionEnabled",
      "IsNegativeQuantityEnabled",
      ...
    ]
  }
}
```

### Install as plugin

1. Install plugin: `sfdx plugins:install sfdx-hydrate`

### Install from source

1. Install the SDFX CLI.

2. Clone the repository: `git clone git@github.com:loganm/sfdx-hydrate.git`

3. Install npm modules: `npm install`

4. Link the plugin: `sfdx plugins:link .`

## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/loganm/sfdx-hydrate. This project is intended to be a safe, welcoming space for collaboration, and contributors are expected to adhere to the [Contributor Covenant](http://contributor-covenant.org) code of conduct.



