const forceUtils = require('../lib/forceUtils.js');
const X2JS = require('x2js');
const jf = require('jsonfile');
const xf = require('xml-formatter');

(function () {
  'use strict';

  module.exports = {
    topic: 'hydrate',
    command: 'packagexml',
    description: 'Generate a complete package xml form the specified org',
    help: 'help text for hydrate:packagexml',
    flags: [{
        name: 'username',
        char: 'u',
        description: 'org that the package will be based on',
        hasValue: true,
        required: false
      },
      {
        name: 'config',
        char: 'c',
        description: 'path to config file',
        hasValue: true,
        required: false
      },
      {
        name: 'api',
        char: 'a',
        description: 'API Version',
        hasValue: true,
        required: false
      },
      {
        name: 'quickfilter',
        char: 'q',
        description: 'CSV separated list of metadata types to filter on',
        hasValue: true,
        required: false
      },
      {
        name: 'formatxml',
        char: 'f',
        description: 'Format the xml output',
        hasValue: false,
        required: false
      },
      {
        name: 'excludeManaged',
        char: 'x',
        description: 'Exclude Managed Packages from output',
        hasValue: false,
        required: false
      }
    ],
    run(context) {

      const username = context.flags.username;
      const configFile = context.flags.config || false;
      let apiVersion;
      let quickFilters;
      let formatxml;
      let excludeManaged;
      const packageTypes = {};

      try {
        if (configFile) {
          jf.readFile(configFile, (err, obj) => {
            if (err) {
              throw err;
            } else {
              /* cli parameters still override whats in the config file */
              apiVersion = context.flags.api || obj.apiVersion || '43.0';
              if (context.flags.quickfilter) {
                quickFilters = context.flags.quickfilter.split(',');
              } else {
                quickFilters = obj.quickfilter || [];
              }
              formatxml = context.flags.formatxml || (obj.formatxml === 'true') || false;
              excludeManaged = context.flags.excludeManaged || (obj.excludeManaged === 'true') || false;
            }
          });
        } else {
          apiVersion = context.flags.api || '43.0';
          if (context.flags.quickfilter) {
            quickFilters = context.flags.quickfilter.split(',');
          } else {
            quickFilters = [];
          }
          formatxml = context.flags.formatxml || false;
          excludeManaged = context.flags.excludeManaged || false;
        }

        forceUtils.getOrg(username, (org) => {
          const connPromise = org.force._getConnection(org, org.config);

          const describePromise = connPromise.then(conn => conn.metadata.describe(apiVersion));

          const foldersPromise = Promise.all([connPromise, describePromise]).then(([conn, describe]) => {
            const folderPromises = [];
            describe.metadataObjects.forEach((object) => {
              if (object.inFolder) {
                const objectType = object.xmlName.replace('Template', '');
                const promise = conn.metadata.list({
                  type: `${objectType}Folder`
                }, apiVersion);
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
              if (folderItems.length > 0) {
                folderItems.forEach((folderItem) => {
                  let objectType = folderItem.type.replace('Folder', '');
                  if (objectType === 'Email') {
                    objectType += 'Template';
                  }
                  const promise = conn.metadata.list({
                    type: objectType,
                    folder: folderItem.fullName
                  }, apiVersion);
                  folderedObjectPromises.push(promise);
                });
              }
            });
            return Promise.all(folderedObjectPromises);
          });

          const unfolderedObjectsPromise = Promise.all([connPromise, describePromise]).then(([conn, describe]) => {
            const unfolderedObjectPromises = [];
            describe.metadataObjects.forEach((object) => {
              if (!object.inFolder) {
                const promise = conn.metadata.list({
                  type: object.xmlName
                }, apiVersion);
                unfolderedObjectPromises.push(promise);
              }
            });
            return Promise.all(unfolderedObjectPromises);
          });

          const queryPromise = connPromise.then(conn => conn.tooling.query('SELECT DeveloperName,ActiveVersion.VersionNumber FROM FlowDefinition'));

          const FlowActiveVersionPromise = Promise.all([queryPromise]).then(([query]) => {
            const FlowDescriptionPromises = {};
            query.records.forEach((records) => {
              if (records.ActiveVersion) {
                if (!FlowDescriptionPromises[records.DeveloperName]) {
                  FlowDescriptionPromises[records.DeveloperName] = [];
                }
                FlowDescriptionPromises[records.DeveloperName].push(records.ActiveVersion.VersionNumber);
              }
            });
            return FlowDescriptionPromises;
          });

          Promise.all([unfolderedObjectsPromise, folderedObjectsPromise, FlowActiveVersionPromise]).then(([unfolderedObjects, folderedObjects, activeFlowVersions]) => {
            // console.error(activeFlowVersions);
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

                      if ((metadataEntries.type && metadataEntries.manageableState !== 'installed') || (metadataEntries.type && metadataEntries.manageableState === 'installed' && !excludeManaged)) {

                        if (metadataEntries.fileName.includes('ValueSetTranslation')) {
                          const x = metadataEntries.fileName.split('.')[1].substring(0, 1).toUpperCase() + metadataEntries.fileName.split('.')[1].substring(1);
                          if (!packageTypes[x]) {
                            packageTypes[x] = [];
                          }
                          packageTypes[x].push(metadataEntries.fullName);
                        } else {

                          if (!packageTypes[metadataEntries.type]) {
                            packageTypes[metadataEntries.type] = [];
                          }

                          if (metadataEntries.type === 'Flow') {

                            if (activeFlowVersions[metadataEntries.fullName]) {
                              packageTypes[metadataEntries.type].push(`${metadataEntries.fullName}-${activeFlowVersions[metadataEntries.fullName]}`);
                            } else {
                              packageTypes[metadataEntries.type].push(metadataEntries.fullName);
                            }

                          } else {
                            packageTypes[metadataEntries.type].push(metadataEntries.fullName);
                          }

                        }
                      }
                    } else {
                      console.error('No metadataEntry available');
                    }
                  });
                }
              } catch (err) {
                console.error(err);
              }
            });

            folderedObjects.forEach((folderedObject) => {
              try {

                if (folderedObject) {
                  let folderedObjectItems = [];
                  if (Array.isArray(folderedObject)) {
                    folderedObjectItems = folderedObject;
                  } else {
                    folderedObjectItems = [folderedObject];
                  }
                  folderedObjectItems.forEach((metadataEntries) => {
                    if (metadataEntries) {
                      if ((metadataEntries.type && metadataEntries.manageableState !== 'installed') || (metadataEntries.type && metadataEntries.manageableState === 'installed' && !excludeManaged)) {

                        if (!packageTypes[metadataEntries.type]) {
                          packageTypes[metadataEntries.type] = [];
                        }
                        packageTypes[metadataEntries.type].push(metadataEntries.fullName);
                      }
                    } else {
                      console.error('No metadataEntry available');
                    }
                  });
                }
              } catch (err) {
                console.error(err);
              }
            });

            if (!packageTypes['StandardValueSet']) {
              packageTypes['StandardValueSet'] = [];
            }
            ['AccountContactMultiRoles', 'AccountContactRole', 'AccountOwnership', 'AccountRating', 'AccountType', 'AddressCountryCode', 'AddressStateCode', 'AssetStatus', 'CampaignMemberStatus', 'CampaignStatus', 'CampaignType', 'CaseContactRole', 'CaseOrigin', 'CasePriority', 'CaseReason', 'CaseStatus', 'CaseType', 'ContactRole', 'ContractContactRole', 'ContractStatus', 'EntitlementType', 'EventSubject', 'EventType', 'FiscalYearPeriodName', 'FiscalYearPeriodPrefix', 'FiscalYearQuarterName', 'FiscalYearQuarterPrefix', 'IdeaCategory', 'IdeaMultiCategory', 'IdeaStatus', 'IdeaThemeStatus', 'Industry', 'InvoiceStatus', 'LeadSource', 'LeadStatus', 'OpportunityCompetitor', 'OpportunityStage', 'OpportunityType', 'OrderStatus', 'OrderType', 'PartnerRole', 'Product2Family', 'QuestionOrigin', 'QuickTextCategory', 'QuickTextChannel', 'QuoteStatus', 'SalesTeamRole', 'Salutation', 'ServiceContractApprovalStatus', 'SocialPostClassification', 'SocialPostEngagementLevel', 'SocialPostReviewedStatus', 'SolutionStatus', 'TaskPriority', 'TaskStatus', 'TaskSubject', 'TaskType', 'WorkOrderLineItemStatus', 'WorkOrderPriority', 'WorkOrderStatus'].forEach((member) => {
              packageTypes['StandardValueSet'].push(member);
            });

            const packageJson = {
              types: [],
              version: apiVersion
            };

            Object.keys(packageTypes).forEach((type) => {
              if ((quickFilters.length === 0 || quickFilters.includes(type))) {
                packageJson.types.push({
                  name: type,
                  members: packageTypes[type]
                });
              }
            });

            const packageXml = `<?xml version="1.0" encoding="UTF-8"?><Package xmlns="http://soap.sforce.com/2006/04/metadata">${new X2JS().js2xml(packageJson)}</Package>`;

            if (formatxml) {
              console.log(xf(packageXml));
            } else {
              console.log(packageXml);
            }
          });

        });
      } catch (err) {
        console.error(err);
      }
    }
  };
}());