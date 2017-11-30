const forceUtils = require('../lib/forceUtils.js');

(function () {
  'use strict';
  
  module.exports = {
    topic: 'hydrate',
    command: 'scratchfile',
    description: 'Create a new scratch file definition from an existing salesforce org',
    help: 'help text for hydrate:scratchfile:create',
    flags: [
      {
        name: 'username',
        char: 'u',
        description: 'org that the scratch file will be based on',
        hasValue: true,
        required: false
      }
    ],
    run(context) {

      const username = context.flags.username;

      const scratchFile = {
        orgName: 'My Company',
        edition: 'Enterprise',
        description: 'Created by the sfdx-hydrate plugin',
        features: [],
        orgPreferences: {
          enabled: [],
          disabled: []
        }
      };
      
      forceUtils.getOrg(username, (org) => {

        const promisePool = [];

        org.force._getConnection(org, org.config).then((conn) => {

          // Org Name
          promisePool.push(conn.query(
            'SELECT Name, OrganizationType FROM Organization',
            (err, res) => {
              const editionTranslations = {
                'Enterprise Edition': 'Enterprise',
                'Developer Edition': 'Developer'
              };
              const organization = res.records[0];
              scratchFile.orgName = organization.Name;
              scratchFile.edition = editionTranslations[organization.OrganizationType];
            }
          ));

          function applySettings(settings, settingValues) {
            settingValues.forEach((value) => {
              if (settings[value]) {
                scratchFile.orgPreferences.enabled.push(value);
              } else {
                scratchFile.orgPreferences.disabled.push(value);
              }
            });
          }

          function applyMetadataSettings(settings, metadataValues) {
            Object.keys(metadataValues).forEach((value) => {
              if (settings[metadataValues[value]]) {
                scratchFile.orgPreferences.enabled.push(value);
              } else {
                scratchFile.orgPreferences.disabled.push(value);
              }
            });
          }
          
          // General Settings
          promisePool.push(conn.tooling.query(
            'SELECT Metadata FROM OrgPreferenceSettings',
            (err, res) => {
              const settings = {};
              if (!err) {
                res.records[0].Metadata.preferences.forEach((value) => {
                  settings[value.settingName] = value.settingValue;
                });
              }
              const settingValues = [
                'AnalyticsSharingEnable',
                'AsyncSaveEnabled',
                'ChatterEnabled',
                'DisableParallelApexTesting',
                'EnhancedEmailEnabled',
                'EventLogWaveIntegEnabled',
                'LoginForensicsEnabled',
                'NetworksEnabled',
                'OfflineDraftsEnabled',
                'PathAssistantsEnabled',
                'S1DesktopEnabled',
                'S1EncryptedStoragePref2',
                'S1OfflinePref',
                'SelfSetPasswordInApi',
                'SendThroughGmailPref',
                'SocialProfilesEnable',
                'Translation',
                'VoiceEnabled'
              ];
              applySettings(settings, settingValues);
            }
          ));

          // Account Settings
          promisePool.push(conn.tooling.query(
            'SELECT Metadata FROM AccountSettings',
            (err, res) => {
              const settings = err ? {} : res.records[0].Metadata;
              const settingValues = {
                'IsAccountTeamsEnabled': 'enableAccountTeams',
                'ShowViewHierarchyLink': 'showViewHierarchyLink'
              };
              applyMetadataSettings(settings, settingValues);
            }
          ));

          // Activities Settings
          promisePool.push(conn.tooling.query(
            'SELECT Metadata FROM ActivitiesSettings',
            (err, res) => {
              const settings = err ? {} : res.records[0].Metadata;
              const settingValues = {
                'IsActivityRemindersEnabled': 'enableActivityReminders',
                'IsDragAndDropSchedulingEnabled': 'enableDragAndDropScheduling',
                'IsEmailTrackingEnabled': 'enableEmailTracking',
                'IsGroupTasksEnabled': 'enableGroupTasks',
                'IsMultidayEventsEnabled': 'enableMultidayEvents',
                'IsRecurringEventsEnabled': 'enableRecurringEvents',
                'IsRecurringTasksEnabled': 'enableRecurringTasks',
                'IsSidebarCalendarShortcutEnabled': 'enableSidebarCalendarShortcut',
                'IsSimpleTaskCreateUiEnabled': 'enableSimpleTaskCreateUI',
                'ShowEventDetailsMultiUserCalendar': 'showEventDetailsMultiUserCalendar',
                'ShowHomePageHoverLinksForEvents': 'showHomePageHoverLinksForEvents',
                'ShowMyTasksHoverLinks': 'showMyTasksHoverLinks'
              };
              applyMetadataSettings(settings, settingValues);
            }
          ));

          // Contract Settings
          promisePool.push(conn.tooling.query(
            'SELECT Metadata FROM ContractSettings',
            (err, res) => {
              const settings = err ? {} : res.records[0].Metadata;
              const settingValues = {
                'AutoCalculateEndDate': 'autoCalculateEndDate',
                'IsContractHistoryTrackingEnabled': 'enableContractHistoryTracking',
                'NotifyOwnersOnContractExpiration': 'notifyOwnersOnContractExpiration'
              };
              applyMetadataSettings(settings, settingValues);
            }
          ));

          // Entitlement Settings
          promisePool.push(conn.tooling.query(
            'SELECT Metadata FROM EntitlementSettings',
            (err, res) => {
              const settings = err ? {} : res.records[0].Metadata;
              const settingValues = {
                'AssetLookupLimitedToActiveEntitlementsOnAccount': 'assetLookupLimitedToActiveEntitlementsOnAccount',
                'AssetLookupLimitedToActiveEntitlementsOnContact': 'assetLookupLimitedToActiveEntitlementsOnContact',
                'AssetLookupLimitedToSameAccount': 'assetLookupLimitedToSameAccount',
                'AssetLookupLimitedToSameContact': 'assetLookupLimitedToSameContact',
                'IsEntitlementsEnabled': 'enableEntitlements',
                'EntitlementLookupLimitedToActiveStatus': 'entitlementLookupLimitedToActiveStatus',
                'EntitlementLookupLimitedToSameAccount': 'entitlementLookupLimitedToSameAccount',
                'EntitlementLookupLimitedToSameAsset': 'entitlementLookupLimitedToSameAsset',
                'EntitlementLookupLimitedToSameContact': 'entitlementLookupLimitedToSameContact'
              };
              applyMetadataSettings(settings, settingValues);
            }
          ));

          // Forecasting Settings
          promisePool.push(conn.tooling.query(
            'SELECT Metadata FROM ForecastingSettings',
            (err, res) => {
              const settings = err ? {} : res.records[0].Metadata;
              const settingValues = {
                'IsForecastsEnabled': 'enableForecasts'
              };
              applyMetadataSettings(settings, settingValues);
            }
          ));

          // Ideas Settings
          promisePool.push(conn.tooling.query(
            'SELECT Metadata FROM IdeasSettings',
            (err, res) => {
              const settings = err ? {} : res.records[0].Metadata;
              const settingValues = {
                'IsChatterProfileEnabled': 'enableChatterProfile',
                'IsIdeaThemesEnabled': 'enableIdeaThemes',
                'IsIdeasEnabled': 'enableIdeas',
                'IsIdeasReputationEnabled': 'enableIdeasReputation'
              };
              applyMetadataSettings(settings, settingValues);
            }
          ));

          // Knowledge Settings
          promisePool.push(conn.tooling.query(
            'SELECT Metadata FROM KnowledgeSettings',
            (err, res) => {
              const settings = err ? {} : res.records[0].Metadata;
              const settingValues = {
                'IsCreateEditOnArticlesTabEnabled': 'enableCreateEditOnArticlesTab',
                'IsExternalMediaContentEnabled': 'enableExternalMediaContent',
                'IsKnowledgeEnabled': 'enableKnowledge',
                'ShowArticleSummariesCustomerPortal': 'showArticleSummariesCustomerPortal',
                'ShowArticleSummariesInternalApp': 'showArticleSummariesInternalApp',
                'ShowArticleSummariesPartnerPortal': 'showArticleSummariesPartnerPortal',
                'ShowValidationStatusField': 'showValidationStatusField'
              };
              applyMetadataSettings(settings, settingValues);
            }
          ));

          // Live Agent Settings
          promisePool.push(conn.tooling.query(
            'SELECT Metadata FROM LiveAgentSettings',
            (err, res) => {
              const settings = err ? {} : res.records[0].Metadata;
              const settingValues = {
                'IsLiveAgentEnabled': 'enableLiveAgent'
              };
              applyMetadataSettings(settings, settingValues);
            }
          ));

          // Marketing Action Settings
          promisePool.push(conn.tooling.query(
            'SELECT Metadata FROM MarketingActionSettings',
            (err, res) => {
              const settings = err ? {} : res.records[0].Metadata;
              const settingValues = {
                'IsMarketingActionEnabled': 'enableMarketingAction'
              };
              applyMetadataSettings(settings, settingValues);
            }
          ));

          // Name Settings
          promisePool.push(conn.tooling.query(
            'SELECT Metadata FROM NameSettings',
            (err, res) => {
              const settings = err ? {} : res.records[0].Metadata;
              const settingValues = {
                'IsMiddleNameEnabled': 'enableMiddleName',
                'IsNameSuffixEnabled': 'enableNameSuffix'
              };
              applyMetadataSettings(settings, settingValues);
            }
          ));

          // Opportunity Settings
          promisePool.push(conn.tooling.query(
            'SELECT Metadata FROM OpportunitySettings',
            (err, res) => {
              const settings = err ? {} : res.records[0].Metadata;
              const settingValues = {
                'IsOpportunityTeamEnabled': 'enableOpportunityTeam'
              };
              applyMetadataSettings(settings, settingValues);
            }
          ));

          // Order Settings
          promisePool.push(conn.tooling.query(
            'SELECT Metadata FROM OrderSettings',
            (err, res) => {
              const settings = err ? {} : res.records[0].Metadata;
              const settingValues = {
                'IsNegativeQuantityEnabled': 'enableNegativeQuantity',
                'IsOrdersEnabled': 'enableOrders',
                'IsReductionOrdersEnabled': 'enableReductionOrders'
              };
              applyMetadataSettings(settings, settingValues);
            }
          ));
          
          // Personal Journey Settings
          promisePool.push(conn.tooling.query(
            'SELECT Metadata FROM PersonalJourneySettings',
            (err, res) => {
              const settings = err ? {} : res.records[0].Metadata;
              const settingValues = {
                'IsExactTargetForSalesforceAppsEnabled': 'enableExactTargetForSalesforceApps'
              };
              applyMetadataSettings(settings, settingValues);
            }
          ));
          
          // Product Settings
          promisePool.push(conn.tooling.query(
            'SELECT Metadata FROM ProductSettings',
            (err, res) => {
              const settings = err ? {} : res.records[0].Metadata;
              const settingValues = {
                'IsCascadeActivateToRelatedPricesEnabled': 'enableCascadeActivateToRelatedPrices',
                'IsQuantityScheduleEnabled': 'enableQuantitySchedule',
                'IsRevenueScheduleEnabled': 'enableRevenueSchedule'
              };
              applyMetadataSettings(settings, settingValues);
            }
          ));
          
          // Quote Settings
          promisePool.push(conn.tooling.query(
            'SELECT Metadata FROM QuoteSettings',
            (err, res) => {
              const settings = err ? {} : res.records[0].Metadata;
              const settingValues = {
                'IsQuoteEnabled': 'enableQuote'
              };
              applyMetadataSettings(settings, settingValues);
            }
          ));
          
          // Search Settings
          promisePool.push(conn.tooling.query(
            'SELECT Metadata FROM SearchSettings',
            (err, res) => {
              const settings = err ? {} : res.records[0].Metadata;
              const settingValues = {
                'DocumentContentSearchEnabled': 'documentContentSearchEnabled',
                'OptimizeSearchForCjkEnabled': 'optimizeSearchForCJKEnabled',
                'RecentlyViewedUsersForBlankLookupEnabled': 'recentlyViewedUsersForBlankLookupEnabled',
                'SidebarAutoCompleteEnabled': 'sidebarAutoCompleteEnabled',
                'SidebarDropDownListEnabled': 'sidebarDropDownListEnabled',
                'SidebarLimitToItemsIownCheckboxEnabled': 'sidebarLimitToItemsIOwnCheckboxEnabled',
                'SingleSearchResultShortcutEnabled': 'singleSearchResultShortcutEnabled',
                'SpellCorrectKnowledgeSearchEnabled': 'spellCorrectKnowledgeSearchEnabled'
              };
              applyMetadataSettings(settings, settingValues);
            }
          ));

          Promise.all(promisePool).then(() => {
            console.log(JSON.stringify(scratchFile, null, '  '));
          });
        });
      });
    }
  };
}());
