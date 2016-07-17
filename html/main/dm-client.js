

selectedNode = {node:null,storage:'',env:''}; 

//refresh the files tree
function refreshTree (){

    //get 3leg token
    var token = get3LegToken();
    var auth = $("#authenticate");
    if (token === '')
        //get token again
        auth.click(authenticate);
    else {
        auth.html('You\'re logged in');
        auth.click(function () {
            if (confirm('And your token is ' + token + '\nWould you like to logoff?')) {
                $.ajax({
                    url: '/dmapi/logoff',
                    type: 'POST',
                    success: function (url) {
                        window.location.reload();
                    }
                });
            }
        });
        prepareTree();
    }
}

$(document).ready(function () {
   refreshTree();
});

function base64encode(str) {
    if (window.btoa) {
        return window.btoa(str);
    }
    // IE9 support
    return window.Base64.encode(str);
}

function get3LegToken() {
    var token = makeSyncRequest('/dmapi/get3LegToken');
    if (token != '') console.log('3 legged token (User Authorization): ' + token);
    return token;
}

//make the sync request
function makeSyncRequest(url) {
    var xmlHttp = null;
    xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", url, false);
    xmlHttp.send(null);
    return xmlHttp.responseText;
}

//call endpoint of authenticate
function authenticate() {
     $.ajax({
        url: '/dmapi/authenticate',
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify({
              'env': $("#env").val()
        }),
        success: function (url) {
            // iframes are not allowed
            PopupCenter(url, "Autodesk Login", 800, 400);
        },
        error: function () {
        }
    });
}

//pop out authentication window
// http://stackoverflow.com/questions/4068373/center-a-popup-window-on-screen
function PopupCenter(url, title, w, h) {
    // Fixes dual-screen position                         Most browsers      Firefox
    var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.left;
    var dualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;

    var width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
    var height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;

    var left = ((width / 2) - (w / 2)) + dualScreenLeft;
    var top = ((height / 2) - (h / 2)) + dualScreenTop;
    var newWindow = window.open(url, title, 'scrollbars=yes, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left);

    // Puts focus on the newWindow
    if (window.focus) {
        newWindow.focus();
    }
}

function prepareTree() {
    $('#myfiles').jstree({
        'core': {
            'themes': {"icons": true},
            'data': {
                "url": '/dmapi/getTreeNode',
                "dataType": "json",
                "data": function (node) {
                    return {"id": node.id};
                }
            }
        },
        'types': {
            'default': {
                'icon': 'glyphicon glyphicon-cloud'
            },
            '#': {
                'icon': 'glyphicon glyphicon-user'
            },
            'hubs': {
                'icon': 'glyphicon glyphicon-inbox'
            },
            'projects': {
                'icon': 'glyphicon glyphicon-list-alt'
            },
            'items': {
                'icon': 'glyphicon glyphicon-briefcase'
            },
            'folders': {
                'icon': 'glyphicon glyphicon-folder-open'
            },
            'versions': {
                'icon': 'glyphicon glyphicon-time'
            }
        },
        "plugins": ["types", "state", "sort"]
    }).bind(
        "activate_node.jstree", function (evt, data) {
            if (data != null && data.node != null && data.node.original != null) {

                //if a node is selected.
                selectedNode.node = data.node;

                if(data.node.type == 'items' ||
                    data.node.type == 'versions' )
                    getItemInfo(data.node.id);
            }
        }
    );
}
function getItemInfo(inputid,onsuccess){
    $.ajax({
        url: '/dmapi/getItemInfo',
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify({ requestid: inputid}),
        success: function (data) {
            console.log(data);
            if (data.result === 'success' // newly submitted data
                || data.Result === 'Created') { // already submitted data
                if (onsuccess !== undefined) {
                    console.log(data.storage);
                }
            }
            selectedNode.storage= data[0].storage;
            downloadDMFile(data[0]);
            console.log('selected storage: ' + selectedNode.storage );
        }
    });
}


function downloadDMFile(input,onsuccess){
    $.ajax({
        url: '/dmapi/downloadDMFile',
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify({ st: input.storage,filename:input.text}),
        success: function (data) {
            console('downloadDMFile succeeded!');
            if (data.result === 'success' // newly submitted data
                || data.Result === 'Created') { // already submitted data
                if (onsuccess !== undefined) {
                    onsuccess();
                }
            }
        }
    });
}

//********************reserved for future ******************************
function get2LegToken() {
    var token = makeSyncRequest('/dmapi/get2LegToken');
    console.log('2 legged token (Developer Authentication): ' + token);
    return token;
}

function getHierarchy(urn, guid, onsuccess) {
    $.ajax({
        url: '/dmapi/hierarchy',
        type: 'GET',
        data: { urn: urn, guid: guid },
        success: function (data) {
            json = JSON.parse(data);
            console.log(data);
            if (onsuccess !== undefined) {
                onsuccess(json);
            }
        }
    });
}


function getDerivatives(inputurn, onsuccess) {
    $.ajax({
        url: '/dmapi/job',
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify({ urn: inputurn }),
        success: function (data) {
            console.log(data);
            if (data.result === 'success' // newly submitted data
                || data.Result === 'Created') { // already submitted data
                if (onsuccess !== undefined) {
                    onsuccess();
                }
            }
        }
    });
}

function showHierarchy(urn) {
    // Clear the tree view
    $('#hierarchy').empty().jstree('destroy');

    // You need to
    // 1) Post a job
    // 2) Get matadata (find the model guid you need)
    // 3) Get the hierarchy based on the urn and model guid
    getDerivatives(urn, function () {
       getMetadata(urn, function (guid) {
           getHierarchy(urn, guid, function (data) {
               prepareHierarchyTree(urn, guid, data.data);
           });
       });
    });
}

function addProperties(nodes) {
    for (nodeId in nodes) {
        var node = nodes[nodeId];
        node.text = node.name;
        node.children = node.objects;
        if (node.objectid === undefined) {
            node.type = 'dunno'
        } else {
            node.type = 'object'
        }
        addProperties(node.objects);
    }
}
//********************reserved for future ******************************

