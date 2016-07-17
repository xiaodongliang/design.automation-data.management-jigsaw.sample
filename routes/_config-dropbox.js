
//Credentials of Dropbox API
module.exports = {
    baseUrl: 'https://www.dropbox.com',
    credentials: {
        //replace the key and secret with your own
        consumerKey: '<your consumer key>',
        consumerSecret: '<your consumer secret>'
    },

    authenticationUrl:'/oauth2/authorize', // for 3 legged token
    accessTokenUrl:'/oauth2/token',  //for 2 legged token

    DropboxRedirectURL:'<your callback url>'
}