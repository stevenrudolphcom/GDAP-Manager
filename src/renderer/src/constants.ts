import { UnifiedRole } from './types';
import { APP_CONFIG } from '../../appConfig';

/**
 * Comprehensive set of Microsoft Entra built-in roles (subset you listed),
 * with correct unified role definition IDs from Microsoft Learn.
 * Source: https://learn.microsoft.com/entra/identity/role-based-access-control/permissions-reference
 * 20260325 >> Added Roles: Authentication Extensibility Administrator, Security Operator, Teams Telephony Administrator, Tenant Creator, Usage Summary Reports Reader
 */
export const AZURE_AD_ROLES: UnifiedRole[] = [
  { id: '9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3', displayName: 'Application Administrator', description: 'Can create and manage all aspects of app registrations and enterprise apps.' },
  { id: 'cf1c38e5-3621-4004-a7cb-879624dced7c', displayName: 'Application Developer', description: 'Can create application registrations independent of the \'Users can register applications\' setting.' },
  { id: '9c6df0f2-1e7c-4dc3-b195-66dfbd24aa8f', displayName: 'Attack Payload Author', description: 'Can create attack payloads that an administrator can initiate later.' },
  { id: 'c430b396-e693-46cc-96f3-db01bf8bb62a', displayName: 'Attack Simulation Administrator', description: 'Can create and manage all aspects of attack simulation campaigns.' },
  { id: '58a13ea3-c632-46ae-9ee0-9c0d43cd7f3d', displayName: 'Attribute Assignment Administrator', description: 'Can assign custom security attribute keys and values to supported Entra objects.' },
  { id: 'ffd52fa5-98dc-465c-991d-fc073eb59f8f', displayName: 'Attribute Assignment Reader', description: 'Can read custom security attribute keys and values for supported Entra objects.' },
  { id: '8424c6f0-a189-499e-bbd0-26c1753c96d4', displayName: 'Attribute Definition Administrator', description: 'Can define and manage custom security attribute definitions.' },
  { id: '1d336d2c-4ae8-42ef-9711-b3604ce3fc2c', displayName: 'Attribute Definition Reader', description: 'Can read custom security attribute definitions.' },
  { id: '5b784334-f94b-471a-a387-e7219fc49ca2', displayName: 'Attribute Log Administrator', description: 'Can read custom security attribute audit logs and configure diagnostics.' },
  { id: '9c99539d-8186-4804-835f-fd51ef9e2dcd', displayName: 'Attribute Log Reader', description: 'Can read audit logs related to custom security attributes.' },
  { id: 'c4e39bd9-1100-46d3-8c65-fb160da0071f', displayName: 'Authentication Administrator', description: 'Can access to view, set and reset authentication method information for any non-admin user.' },
  { id: '0526716b-113d-4c15-b2c8-68e3c22b9f80', displayName: 'Authentication Policy Administrator', description: 'Can manage authentication method policies and password protection settings.' },
  { id: '25a516ed-2fa0-40ea-a2d0-12923a21473a', displayName: 'Authentication Extensibility Administrator', description: 'Customize sign in and sign up experiences for users by creating and managing custom authentication extensions.' }, // NEU
  { id: 'e3973bdf-4987-49ae-837a-ba8e231c7286', displayName: 'Azure DevOps Administrator', description: 'Can manage Azure DevOps policies and settings.' },
  { id: '7495fdc4-34c4-4d15-a289-98788ce399fd', displayName: 'Azure Information Protection Administrator', description: 'Can manage all aspects of the Azure Information Protection product.' },
  { id: 'b0f54661-2d74-4c50-afa3-1ec803f12efe', displayName: 'Billing Administrator', description: 'Can perform common billing related tasks like updating payment information.' },
  { id: 'aaf43236-0c0d-4d5f-883a-6955382ac081', displayName: 'B2C IEF Keyset Administrator', description: 'Can create and manage cryptographic keys used by External ID custom policies.' },
  { id: '3edaf663-341e-4475-9f94-5c398ef6c070', displayName: 'B2C IEF Policy Administrator', description: 'Can create and manage External ID custom policies.' },
  { id: '158c047a-c907-4556-b7ef-446551a6b5f7', displayName: 'Cloud Application Administrator', description: 'Can create and manage all aspects of app registrations and enterprise apps except App Proxy.' },
  { id: '892c5842-a9a6-463a-8041-72aa08ca3cf6', displayName: 'Cloud App Security Administrator', description: 'Can manage Microsoft Defender for Cloud Apps settings and policies.' },
  { id: '7698a772-787b-4ac8-901f-60d6b08affd2', displayName: 'Cloud Device Administrator', description: 'Limited access to manage devices in Microsoft Entra ID.' },
  { id: '17315797-102d-40b4-93e0-432062caca18', displayName: 'Compliance Administrator', description: 'Can read and manage compliance configuration and reports in Microsoft Entra ID and Microsoft 365.' },
  { id: 'e6d1a23a-da11-4be4-9570-befc86d067a7', displayName: 'Compliance Data Administrator', description: 'Can manage compliance data operations, including content search and export workflows.' },
  { id: 'b1be1c3e-b65d-4f19-8427-f6fa0d97feb9', displayName: 'Conditional Access Administrator', description: 'Can manage Conditional Access capabilities.' },
  { id: '5c4f9dcd-47dc-4cf7-8c9a-9e4207cbfc91', displayName: 'Customer Lockbox Access Approver', description: 'Can approve or deny Customer Lockbox requests for Microsoft support access.' },
  { id: '38a96431-2bdf-4b4c-8b6e-5d3d8abac1a4', displayName: 'Desktop Analytics Administrator', description: 'Can access and manage Desktop management tools and services.' },
  { id: '88d8e3e3-8f55-4a1e-953a-9b9898b8876b', displayName: 'Directory Readers', description: 'Can read basic directory information.' },
  { id: 'd29b2b05-8046-44ba-8758-1e26182fcf32', displayName: 'Directory Synchronization Accounts', description: 'Only used by Microsoft Entra Connect service.' },
  { id: '9360feb5-f418-4baa-8175-e2a00bac4301', displayName: 'Directory Writers', description: 'Can read and write basic directory information; for granting access to applications, not intended for users.' },
  { id: '8329153b-31d0-4727-b945-745eb3bc5f31', displayName: 'Domain Name Administrator', description: 'Can manage domain names in cloud and on-premises.' },
  { id: 'e93e3737-fa85-474a-aee4-7d3fb86510f3', displayName: 'Dragon Administrator', description: 'Can manage all aspects of the Microsoft Dragon admin center.' },
  { id: '44367163-eba1-44c3-98af-f5787879f96a', displayName: 'Dynamics 365 Administrator', description: 'Can manage all aspects of the Dynamics 365 product.' },
  { id: '963797fb-eb3b-4cde-8ce3-5878b3f32a3f', displayName: 'Dynamics 365 Business Central Administrator', description: 'Can perform all administrative tasks on Dynamics 365 Business Central environments.' },
  { id: '3f1acade-1e04-4fbc-9b69-f0302cd84aef', displayName: 'Edge Administrator', description: 'Can manage enterprise configuration and settings for Microsoft Edge.' },
  { id: '29232cdf-9323-42fd-ade2-1d097af3e4de', displayName: 'Exchange Administrator', description: 'Can manage all aspects of the Exchange product.' },
  { id: '31392ffb-586c-42d1-9346-e59415a2cc4e', displayName: 'Exchange Recipient Administrator', description: 'Can create or update Exchange Online recipients within the Exchange Online organization.' },
  { id: 'be2f45a1-457d-42af-a067-6ec1fa63bc45', displayName: 'External Identity Provider Administrator', description: 'Can configure identity providers for use in direct federation.' },
  { id: '6e591065-9bad-43ed-90f3-e9424366d2f0', displayName: 'External ID User Flow Administrator', description: 'Can create and manage External ID user flows.' },
  { id: '0f971eea-41eb-4569-a71e-57bb8a3eff1e', displayName: 'External ID User Flow Attribute Administrator', description: 'Can create and manage custom attributes for External ID user flows.' },
  { id: 'a9ea8996-122f-4c74-9520-8edcd192826c', displayName: 'Fabric Administrator', description: 'Can manage Microsoft Fabric tenant settings and admin features.' },
  { id: '62e90394-69f5-4237-9190-012177145e10', displayName: 'Global Administrator', description: 'Can manage all aspects of Microsoft Entra ID and Microsoft services that use Microsoft Entra identities.' },
  { id: 'f2ef992c-3afb-46b9-b7cf-a126ee74c451', displayName: 'Global Reader', description: 'Can read everything that a Global Administrator can, but not update anything.' },
  { id: 'ac434307-12b9-4fa1-a708-88bf58caabc1', displayName: 'Global Secure Access Administrator', description: 'Can create and manage Microsoft Entra Internet Access and Private Access.' },
  { id: 'fdd7a751-b60b-444a-984c-02652fe8fa1c', displayName: 'Groups Administrator', description: 'Members of this role can create/manage groups, manage group settings, and view groups activity and audit reports.' },
  { id: '95e79109-95c0-4d8e-aee3-d01accf2d47b', displayName: 'Guest Inviter', description: 'Can invite guest users independent of the \'members can invite guests\' setting.' },
  { id: '729827e3-9c14-49f7-bb1b-9608f156bbb8', displayName: 'Helpdesk Administrator', description: 'Can reset passwords for non-administrators and Helpdesk Administrators.' },
  { id: '8ac3fc64-6eca-42ea-9e69-59f4c7b60eb2', displayName: 'Hybrid Identity Administrator', description: 'Manage Microsoft Entra Connect, PTA, PHS, seamless SSO, and federation settings.' },
  { id: '45d8d3c5-c802-45c6-b32a-1d70b5e1e86e', displayName: 'Identity Governance Administrator', description: 'Can manage identity governance features like access reviews and entitlement management.' },
  { id: 'eb1f4a8d-243a-41f0-9fbd-c7cdf6c5ef7c', displayName: 'Insights Administrator', description: 'Has administrative access in the Microsoft 365 Insights app.' },
  { id: '25df335f-86eb-4119-b717-0ff02de207e9', displayName: 'Insights Analyst', description: 'Can analyze data and run custom queries in Microsoft Viva Insights.' },
  { id: '31e939ad-9672-4796-9c2e-873181342d2d', displayName: 'Insights Business Leader', description: 'Can access and use business leader insights in Microsoft Viva Insights.' },
  { id: '3a2c62db-5318-420d-8d74-23affee5d9d5', displayName: 'Intune Administrator', description: 'Can manage all aspects of the Intune product.' },
  { id: '74ef975b-6605-40af-a5d2-b9539d836353', displayName: 'Kaizala Administrator', description: 'Can manage Microsoft Kaizala settings and related administrative controls.' },
  { id: 'b5a8dcf3-09d5-43a9-a639-8e29ef291470', displayName: 'Knowledge Administrator', description: 'Can create and manage knowledge experiences and answers in Microsoft 365.' },
  { id: '744ec460-397e-42ad-a462-8b3f9747a02c', displayName: 'Knowledge Manager', description: 'Can curate and manage organizational knowledge content in Microsoft 365.' },
  { id: '4d6ac14f-3453-41d0-bef9-a3e0c569773a', displayName: 'License Administrator', description: 'Can manage product licenses on users and groups.' },
  { id: '59d46f88-662b-457b-bceb-5c3809e5908f', displayName: 'Lifecycle Workflows Administrator', description: 'Can create and manage lifecycle workflows and related tasks in Microsoft Entra ID.' },
  { id: 'ac16e43d-7b2d-40e0-ac05-243ff356ab5b', displayName: 'Message Center Privacy Reader', description: 'Can read security messages and updates in Office 365 Message Center only.' },
  { id: '790c1fb9-7f7d-4f88-86a1-ef1f95c05c1b', displayName: 'Message Center Reader', description: 'Can read messages and updates for their organization in Office 365 Message Center only.' },
  { id: '8c8b803f-96e1-4129-9349-20738d9f9652', displayName: 'Microsoft 365 Migration Administrator', description: 'Can manage content migration to Microsoft 365 using Migration Manager.' },
  { id: '1501b917-7653-4ff9-a4b5-203eaf33784f', displayName: 'Microsoft Hardware Warranty Administrator', description: 'Can create and manage all aspects of Microsoft hardware warranty claims.' },
  { id: '281fe777-fb20-4fbb-b7a3-ccebce5b0d96', displayName: 'Microsoft Hardware Warranty Specialist', description: 'Can create and read owned Microsoft hardware warranty claims.' },
  { id: '9f06204d-73c1-4d4c-880a-6edb90606fd8', displayName: 'Microsoft Entra Joined Device Local Administrator', description: 'Users assigned to this role are added to the local administrators group on Microsoft Entra joined devices.' },
  { id: 'd37c8bed-0711-4417-ba38-b4abe66ce4c2', displayName: 'Network Administrator', description: 'Can manage network locations and review enterprise network design insights for Microsoft 365 applications.' },
  { id: '2b745bdf-0803-4d80-aa65-822c4493daac', displayName: 'Office Apps Administrator', description: 'Can manage Office apps cloud services, including policy and settings management.' },
  { id: '92ed04bf-c94a-4b82-9729-b799a7a4c178', displayName: 'Organizational Branding Administrator', description: 'Can manage all aspects of organizational branding in a tenant.' },
  { id: 'e48398e2-f4bb-4074-8f31-4586725e205b', displayName: 'Organizational Messages Approver', description: 'Can review, approve, or reject organizational messages before delivery.' },
  { id: '507f53e4-4e52-4077-abd3-d2e1558b6ea2', displayName: 'Organizational Messages Writer', description: 'Can write, publish, and manage organizational messages for end users.' },
  { id: '966707d0-3269-4727-9be2-8c3a10f19b9d', displayName: 'Password Administrator', description: 'Can reset passwords for non-administrators and Password Administrators.' },
  { id: 'af78dc32-cf4d-46f9-ba4e-4428526346b5', displayName: 'Permissions Management Administrator', description: 'Can manage all aspects of Microsoft Entra Permissions Management.' },
  { id: '11648597-926c-4cf3-9c36-bcebb0ba8dcc', displayName: 'Power Platform Administrator', description: 'Can create and manage all aspects of Microsoft Dynamics 365, Power Apps and Power Automate.' },
  { id: '644ef478-e28f-4e28-b9dc-3fdde9aa0b1f', displayName: 'Printer Administrator', description: 'Can manage all aspects of printers and printer connectors.' },
  { id: 'e8cef6f1-e4bd-4ea8-bc07-4b8d950f4477', displayName: 'Printer Technician', description: 'Can register and unregister printers and update printer status.' },
  { id: '7be44c8a-adaf-4e2a-84d6-ab2649e08a13', displayName: 'Privileged Authentication Administrator', description: 'Can access to view, set and reset authentication method information for any user (admin or non-admin).' },
  { id: 'e8611ab8-c189-46e8-94e1-60213ab1f814', displayName: 'Privileged Role Administrator', description: 'Can manage role assignments in Microsoft Entra ID, and all aspects of Privileged Identity Management.' },
  { id: '4a5d8f65-41da-4de4-8968-e035b65339cf', displayName: 'Reports Reader', description: 'Can read sign-in and audit reports.' },
  { id: '0964bb5e-9bdb-4d7b-ac29-58e794862a40', displayName: 'Search Administrator', description: 'Can create and manage all aspects of Microsoft Search settings.' },
  { id: '8835291a-918c-4fd7-a9ce-faa49f0cf7d9', displayName: 'Search Editor', description: 'Can create and manage the editorial content such as bookmarks, Q and As, locations, floorplan.' },
  { id: '194ae4cb-b126-40b2-bd5b-6091b380977d', displayName: 'Security Administrator', description: 'Can read security information and reports, and manage configuration in Microsoft Entra ID and Office 365.' },
  { id: '5f2222b1-57c3-48ba-8ad5-d4759f1fde6f', displayName: 'Security Operator', description: 'Creates and manages security events.' }, // NEU
  { id: '5d6b6bb7-de71-4623-b4af-96380a352509', displayName: 'Security Reader', description: 'Can read security information and reports in Microsoft Entra ID and Office 365.' },
  { id: 'f023fd81-a637-4b56-95fd-791ac0226033', displayName: 'Service Support Administrator', description: 'Can read service health information and manage support tickets.' },
  { id: 'f28a1f50-f6e7-4571-818b-6a12f2af6b6c', displayName: 'SharePoint Administrator', description: 'Can manage all aspects of the SharePoint service.' },
  { id: '1a7d78b6-429f-476b-b8eb-35fb715fffd4', displayName: 'SharePoint Embedded Administrator', description: 'Can manage all aspects of SharePoint Embedded containers.' },
  { id: '75941009-915a-4869-abe7-691bff18279e', displayName: 'Skype for Business Administrator', description: 'Can manage all aspects of the Skype for Business product.' },
  { id: '69091246-20e8-4a56-aa4d-066075b2a7a8', displayName: 'Teams Administrator', description: 'Can manage the Microsoft Teams service.' },
  { id: 'baf37b3a-610e-45da-9e62-d9d1e5e8914b', displayName: 'Teams Communications Administrator', description: 'Can manage calling and meetings features within the Microsoft Teams service.' },
  { id: 'f70938a0-fc10-4177-9e90-2178f8765737', displayName: 'Teams Communications Support Engineer', description: 'Can troubleshoot communications issues within Teams using advanced tools.' },
  { id: 'fcf91098-03e3-41a9-b5ba-6f0ec8188a12', displayName: 'Teams Communications Support Specialist', description: 'Can troubleshoot communications issues within Teams using basic tools.' },
  { id: '3d762c5a-1b6c-493f-843e-55a3b42923d4', displayName: 'Teams Devices Administrator', description: 'Can perform management related tasks on Teams certified devices.' },
  { id: 'aa38014f-0993-46e9-9b45-30501a20909d', displayName: 'Teams Telephony Administrator', description: 'Manage voice and telephony features and troubleshoot communication issues within the Microsoft Teams service.' }, // NEU
  { id: '112ca1a2-15ad-4102-995e-45b0bc479a6a', displayName: 'Tenant Creator', description: 'Create new Microsoft Entra or Azure AD B2C tenants.' }, // NEU
  { id: '75934031-6c7e-415a-99d7-48dbd49e875e', displayName: 'Usage Summary Reports Reader', description: 'Read Usage reports and Adoption Score, but can\'t access user details.' }, // NEU
  { id: '27460883-1df1-4691-b032-3b79643e5e63', displayName: 'User Experience Success Manager', description: 'Can read adoption insights, feedback data, and organizational usage trends.' },
  { id: 'e300d9e7-4a2b-4295-9eff-f1c78b36cc98', displayName: 'Virtual Visits Administrator', description: 'Can manage Virtual Visits settings, reports, and metrics.' },
  { id: '92b086b3-e367-4ef2-b869-1de128fb986e', displayName: 'Viva Goals Administrator', description: 'Can manage and configure all aspects of Microsoft Viva Goals.' },
  { id: '87761b17-1ed2-4af3-9acd-92a150038160', displayName: 'Viva Pulse Administrator', description: 'Can manage all settings and administration of Microsoft Viva Pulse.' },
  { id: '32696413-001a-46ae-978c-ce0f6b3620d2', displayName: 'Windows Update Deployment Administrator', description: 'Can manage Windows Update for Business deployment service settings and policies.' },
  { id: '810a2642-a034-447f-a5e8-41beaa378541', displayName: 'Yammer Administrator', description: 'Can manage all aspects of the Yammer service.' },
  { id: 'fe930be7-5e62-47db-91af-98c3a49a38b1', displayName: 'User Administrator', description: 'Can manage all aspects of users and groups, including resetting passwords for limited admins.' },
  { id: '11451d60-acb2-45eb-a7d6-43d0f0125c13', displayName: 'Windows 365 Administrator', description: 'Can provision and manage all aspects of Cloud PCs.' },
  ];

/**
 * Default role IDs for the creation form.
 */
export const DEFAULT_ROLE_IDS: string[] = AZURE_AD_ROLES.map((role) => role.id);

/**
 * Group assignment templates from APP_CONFIG.
 */
export const GROUP_TEMPLATES = Object.fromEntries(
  Object.entries(APP_CONFIG.TEMPLATES).map(([key, template]) => [
    key.toLowerCase(),
    {
      ...template,
      name: key,
    },
  ])
) as Record<string, { name: string; groupId?: string; roleIds: string[] }>;

export function toUnifiedRoles(roleIds: string[]) {
  return roleIds.map((id) => ({ roleDefinitionId: id }));
}

export function toUnifiedRolesFromDefaults() {
  return toUnifiedRoles(DEFAULT_ROLE_IDS);
}