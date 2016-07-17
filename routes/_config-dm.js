var OAUTH_VERSION = 'v1'; // Authentication
var DM_PROJECT_VERSION = 'v1'; // Data Management
var MD_PROJECT_VERSION = 'v2'; // Model Derivative

module.exports = {

    //refirect URL for local test
    // change /etc/hosts file to redirect loca.host as 127.0.0.1
    // redirectUrl: '<your local callback url >',

    //refirect URL for deployment, replace this with your own
    redirectUrl: '<your callback url >',

    authenticationUrl: '/authentication/' + OAUTH_VERSION + '/authorize',
    accessTokenUrl: '/authentication/' + OAUTH_VERSION + '/gettoken',

    //['data:read', 'data:create', 'data:write', 'bucket:read', 'bucket:create'],
    scope: 'data:read data:create data:write bucket:read bucket:create',

    baseURL: function (env) {
        return require('./config-' + env).baseUrl;
    },
    credentials: {
        consumerKey: function (env) {
            return require('./config-' + env).credentials.consumerKey;
        },  
        consumerSecret: function (env) {
            return require('./config-' + env).credentials.consumerSecret;
        }
    },

    hubs: '/project/' + DM_PROJECT_VERSION + '/hubs',
    projects: function (hubId) {
        return '/project/' + DM_PROJECT_VERSION + '/hubs/' + hubId + '/projects';
    },
    project: function (hubId, projectId) {
        return '/project/' + DM_PROJECT_VERSION + '/hubs/' + hubId + '/projects/' + projectId;
    },
    folderContents: function (projectId, folderId) {
        return '/data/' + DM_PROJECT_VERSION + '/projects/' + projectId + '/folders/' + folderId + '/contents';
    },

    itemVersions: function (projectId, itemId) {
        return '/data/' + DM_PROJECT_VERSION + '/projects/' + projectId + '/items/' + itemId + '/versions';
    },
    version: function (projectId, versionId) {
        return '/data/' + DM_PROJECT_VERSION + '/projects/' + projectId + '/versions/' + versionId;
    },
    signedDownloadURL: function (bucketid,itemId) {
        return '/oss/' + 'v2' + '/buckets/' + bucketid + '/objects/' + itemId;// + '/signed';
    },
    thumbail: function (urn) {
        return '/viewingservice/' + DM_PROJECT_VERSION + '/thumbnails/' + urn;
    },

    job: '/modelderivative/' + MD_PROJECT_VERSION + '/designdata/job',
    manifest: function (urn) {
        return '/modelderivative/' + MD_PROJECT_VERSION + '/designdata/' + urn + '/manifest';
    },
    download: function (urn, derUrn) {
        return '/modelderivative/' + MD_PROJECT_VERSION + '/designdata/' + urn + '/manifest/' + derUrn;
    },
    metadata: function (urn) {
        return '/modelderivative/' + MD_PROJECT_VERSION + '/designdata/' + urn + '/metadata';
    },
    hierarchy: function (urn, guid) {
        return '/modelderivative/' + MD_PROJECT_VERSION + '/designdata/' + urn + '/metadata/' + guid;
    }
}
