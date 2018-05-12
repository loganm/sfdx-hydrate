# sfdx-hydrate

This is a plugin to help create new SFDX projects from existing Salesforce orgs. The ultimate goal is to run an `sfdx hydrate:project` command, and produce an SFDX project from an existing orgs metadata.

## Creating a scratch file from a source org

The first feature built towards this goal is creating a scratch file. Salesforce is piloting an org shape feature, but I'm impatient and could get 90% of the way there without it.

The only missing piece from the resulting scratch org is the features list. I'm working on it.

Run the command:

```
$ sfdx hydrate:scratchfile -u {username|alias} > project-scratch-def.json
```

This will produce a scratch definition and pipe it into the project-scratch-def.json file.

## Creating a complete package.xml from a source org

When migrating to an SFDX project, I find starting with a complete package.xml, and then trimming undesirable metadata elements until I have a working project is a good approach.

This addition to the hydrate tool will generate that complete package.xml.

Run the command:

```
$ sfdx hydrate:packagexml -u {username|alias} > package.xml
```

This will produce an XML string, and pipe it directly into the file called package.xml.

#### Optional Parameters
|Parameter|Description|
|---|---|
|-a, --api|Set the API version of the packagexml file (Default is 42.0)|
|-c, --config|Configuration file to help make pulling metadata more scriptable|

An example config file is defined below. The "quickfilter" array lets you specify a list of metadata types that will be included in the output. You can have the xml output formatted by setting the "formatxml" to true.
```javascript
    //config.json
    {
        "quickfilter": ["Report",
            "Dashboard",
            "ReportType"
        ],
        "formatxml":"true"
    }

```

```
$ sfdx hydrate:packagexml -u {username|alias} -a 40.0 -c ./config.json > package.xml
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



