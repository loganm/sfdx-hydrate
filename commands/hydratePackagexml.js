const forceUtils = require('../lib/forceUtils.js');

(function () {
  'use strict';
  
  module.exports = {
    topic: 'hydrate',
    command: 'packagexml',
    description: 'Generate a complete package xml form the specified org',
    help: 'help text for hydrate:packagexml:create',
    flags: [
      {
        name: 'username',
        char: 'u',
        description: 'org that the package will be based on',
        hasValue: true,
        required: false
      }
    ],
    run(context) {

      const username = context.flags.username;
      const apiVersion = '42.0';

      const packageXml = {
        types: {},
        version: apiVersion
      };
      
      forceUtils.getOrg(username, (org) => {

        const connPromise = org.force._getConnection(org, org.config);

        const describePromise = connPromise.then((conn) => {
          return conn.metadata.describe(apiVersion);
        });

        const foldersPromise = Promise.all([connPromise, describePromise]).then((params) => {
          const conn = params[0];
          const describe = params[1];

          const folderPromises = [];

          describe.metadataObjects.forEach((object) => {
            if (object.inFolder) {
              const objectType = object.xmlName.replace('Template', '');
              const promise = conn.metadata.list({ type: `${objectType}Folder`, folder: null }, apiVersion)
              folderPromises.push(promise);
            }
          });

          return Promise.all(folderPromises);
        });

        const folderedObjectsPromise = Promise.all([connPromise, foldersPromise]).then((params) => {
          const conn = params[0];
          const folders = params[1];

          const folderedObjectPromises = [];

          folders.forEach((folder) => {
            try {
              let objectType = folder.type.replace('Folder', '');
              if (objectType === 'Email') {
                objectType += 'Template';
              }
              const promise = conn.metadata.list({ type: objectType, folder: folder.fullName }, apiVersion);
              folderedObjectPromises.push(promise);
            } catch (exception) {}
          });

          return folderedObjectPromises;
        });

        const unfolderedObjectsPromise = Promise.all([connPromise, describePromise]).then((params) => {
          const conn = params[0];
          const describe = params[1];

          const unfolderedObjectPromises = [];

          describe.metadataObjects.forEach((object) => {
            if (!object.inFolder && object.xmlName !== 'StandardValueSetTranslation') {
              const promise = conn.metadata.list({ type: object.xmlName, folder: null }, apiVersion);
              unfolderedObjectPromises.push(promise);
            }
          });

          return Promise.all(unfolderedObjectPromises);
        });

        Promise.all([unfolderedObjectsPromise, folderedObjectsPromise]).then((params) => {
          const unfolderedObjects = params[0];
          const folderedObjects = params[1];

          unfolderedObjects.forEach((unfolderedObject) => {
            try {
              unfolderedObject.forEach((metadataEntry) => {
                if (!packageXml.types[metadataEntry.type]) {
                  packageXml.types[metadataEntry.type] = [];
                }
                packageXml.types[metadataEntry.type].push(metadataEntry.fullName);
              });
            } catch (exception) {}
          });

          folderedObjects.forEach((folderedObject) => {
            try {
              folderedObject.forEach((metadataEntry) => {
                if (!packageXml.types[metadataEntry.type]) {
                  packageXml.types[metadataEntry.type] = [];
                }
                packageXml.types[metadataEntry.type].push(metadataEntry.fullName);
              });
            } catch (exception) {}
          });

          console.log(JSON.stringify(packageXml, null, '    '));
        });

      });
    }
  };
}());
