//Credentials of Design Automation API in production enviroment

module.exports = {
    hostName: 'developer.api.autodesk.com',
    baseUrl: function(hostName){
        return 'https://' + hostName;
    },
    workItemsUrl:function(baseUrl){
        return baseUrl + '/autocad.io/us-east/v2/WorkItems';
    },
    authUrl:function(baseUrl){
        return baseUrl + '/authentication/v1/authenticate';
    },
    credentials: {
        consumerKey: '<your consumer key>',
        consumerSecret: '<your consumer secret>'
    },
    activityName:'Adsk_JigsawActivity'
}