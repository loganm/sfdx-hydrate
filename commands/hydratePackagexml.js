const forceUtils = require('../lib/forceUtils.js');
const X2JS = require('x2js');
const quickFilters = require('../assets/quickFilters.json');

(function () {
  'use strict';
  
  module.exports = {
    topic: 'hydrate',
    command: 'packagexml',
    description: 'Generate a complete package xml form the specified org',
    help: 'help text for hydrate:packageJson:create',
    flags: [
      {
        name: 'username',
        char: 'u',
        description: 'org that the package will be based on',
        hasValue: true,
        required: false
      },
      {
        name: 'quickfilter',
        char: 'q',
        description: 'a predefined set of metadata types',
        hasValue: true,
        required: false
      },
      {
        name: 'api',
        char: 'a',
        description: 'API Version',
        hasValue: true,
        required: false
      }
    ],
    run(context) {

      const username = context.flags.username;
      const apiVersion = context.flags.api || '42.0';
      const quickFilter = context.flags.quickfilter;

      let packageTypes = {};
      
      forceUtils.getOrg(username, (org) => {

        const connPromise = org.force._getConnection(org, org.config);

        const describePromise = connPromise.then((conn) => {
          return conn.metadata.describe(apiVersion);
        });

        const foldersPromise = Promise.all([connPromise, describePromise]).then(([conn, describe]) => {
          const folderPromises = [];
          describe.metadataObjects.forEach((object) => {
            if (object.inFolder) {
              const objectType = object.xmlName.replace('Template', '');
              const promise = conn.metadata.list({ type: `${objectType}Folder`, folder: null }, apiVersion);
              folderPromises.push(promise);
            }
          });
          return Promise.all(folderPromises);
        });

        const folderedObjectsPromise = Promise.all([connPromise, foldersPromise]).then(([conn, folders]) => {
          const folderedObjectPromises = [];
          folders.forEach((folder) => {
            let folderItems = [];
            if (Array.isArray(folder)) {
              folderItems = folder;
            } else if (folder) {
              folderItems = [folder];
            }
            if (folderItems.size > 0) {
              folderItems.forEach((folderItem) => {
                let objectType = folderItem.type.replace('Folder', '');
                if (objectType === 'Email') {
                  objectType += 'Template';
                }
                const promise = conn.metadata.list({ type: objectType, folder: folderItem.fullName }, apiVersion);
                folderedObjectPromises.push(promise);
              });
            }
          });
          return Promise.all(folderedObjectPromises);
        });

        const unfolderedObjectsPromise = Promise.all([connPromise, describePromise]).then(([conn, describe]) => {
          const unfolderedObjectPromises = [];
          describe.metadataObjects.forEach((object) => {
            if (!object.inFolder && object.xmlName !== 'StandardValueSetTranslation') {
              const promise = conn.metadata.list({ type: object.xmlName, folder: null }, apiVersion);
              unfolderedObjectPromises.push(promise);
            }
          });
          return Promise.all(unfolderedObjectPromises);
        });

        Promise.all([unfolderedObjectsPromise, folderedObjectsPromise]).then(([unfolderedObjects, folderedObjects]) => {
          unfolderedObjects.forEach((unfolderedObject) => {
            try {
              if (unfolderedObject) {
                let unfolderedObjectItems = [];
                if (Array.isArray(unfolderedObject)) {
                  unfolderedObjectItems = unfolderedObject;
                } else {
                  unfolderedObjectItems = [unfolderedObject];
                }
                unfolderedObjectItems.forEach((metadataEntries) => {
                  if (metadataEntries) {
                    if (metadataEntries.type) {
                      if (!packageTypes[metadataEntries.type]) {
                        packageTypes[metadataEntries.type] = [];
                      }
                      packageTypes[metadataEntries.type].push(metadataEntries.fullName);
                    } else {
                      metadataEntries.forEach((metadataEntry) => {
                        if (!packageTypes[metadataEntry.type]) {
                          packageTypes[metadataEntry.type] = [];
                        }
                        packageTypes[metadataEntry.type].push(metadataEntry.fullName);
                      });
                    }
                  }
                });
              }
            } catch (exception) {
              // console.log(unfolderedObject);
            }
          });

          folderedObjects.forEach((folderedObject) => {
            try {
              folderedObject.forEach((metadataEntries) => {
                if (metadataEntries.type) {
                  if (!packageTypes[metadataEntries.type]) {
                    packageTypes[metadataEntries.type] = [];
                  }
                  packageTypes[metadataEntries.type].push(metadataEntries.fullName);
                } else {
                  metadataEntries.forEach((metadataEntry) => {
                    if (!packageTypes[metadataEntry.type]) {
                      packageTypes[metadataEntry.type] = [];
                    }
                    packageTypes[metadataEntry.type].push(metadataEntry.fullName);
                  });
                }
              });
            } catch (exception) {}
          });
          
          const packageJson = {
            types: [],
            version: apiVersion
          };

          Object.keys(packageTypes).forEach((type) => {
            if(!quickFilter||quickFilters[quickFilter].includes(type)){
              packageJson.types.push({ name: type, members: packageTypes[type] });
            }
          });

          const packageXml = `<?xml version="1.0" encoding="UTF-8"?><Package xmlns="http://soap.sforce.com/2006/04/metadata">${new X2JS().js2xml(packageJson)}</Package>`;

          console.log(packageXml);
        });

      });
    }
  };
}());
