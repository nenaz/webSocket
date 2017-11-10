var WebSocketServer = require('websocket').server;
var http = require('http');

var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(8099, function() {
    console.log((new Date()) + ' Server is listening on port 8099');
});

wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production 
    // applications, as it defeats all standard cross-origin protection 
    // facilities built into the protocol and the browser.  You should 
    // *always* verify the connection's origin and decide whether or not 
    // to accept it. 
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed. 
    return true;
}

/*********************************************************************************/

var dataObj = {
    'GetAccounts': ["Accounts", [{
            "client": "2041111",
            "accounts": [
                { "id": "40807840900000000945", "sum": "2000000.01", "hold": "150001.00" },
                { "id": "40807840900000000145", "sum": "2000000.07", "hold": "2900000.00" },
                { "id": "40807978300000000113", "sum": "1234005.52", "hold": "1450780.34" },
                { "id": "40807978300000000112", "sum": "1234005.12", "hold": "2450780.34" },
                { "id": "40807810900000000159", "sum": "100345345.11", "hold": "7000000" },
                { "id": "40807810900000000169", "sum": "134005345.39", "hold": "100000000" },
                { "id": "40702156909999999900", "sum": "774057349.09", "hold": "100000000" }
            ]
        },
        {
            "client": "2041232",
            "accounts": [
                { "id": "40702810200001040004", "sum": "4156000.04", "hold": "150001.00" },
                { "id": "40702840700001050005", "sum": "2660000.03", "hold": "2900000.00" },
                { "id": "40702810300000010001", "sum": "28461.64", "hold": "1450780.34" },
                { "id": "40702810400000020002", "sum": "38767340.12", "hold": "2450780.34" },
                { "id": "40702840900000030003", "sum": "267441.81", "hold": "7000000" },
                { "id": "40702978700001060006", "sum": "1267441.08", "hold": "100000000" },
            ]
        }
    ]]
};
var clientId = '';
var clientNum = -1;

var currencyConst = [
    { sym: "USD/RUB", rates: { sell: { min: 60, max: 62 }, buy: { min: 62, max: 63 } } },
    { sym: "EUR/RUB", rates: { sell: { min: 61, max: 63 }, buy: { min: 64, max: 65 } } },
    { sym: "EUR/USD", rates: { sell: { min: 1.1, max: 1.3 }, buy: { min: 1.3, max: 1.5 } } },
];

var idTimerGenerateOneRate = 0;

var getActualOrg = function() {
    var client = dataObj.GetAccounts[1].filter(function(item, key) {
        if (item.client === clientId) {
            clientNum = key;
        }
        return item.client === clientId;
    });
    return client[0];
}

var ProcessingRequests = function(nameRequest, dataRequest, activeData) {
    this.init();
}

ProcessingRequests.prototype.init = function() {
    console.log('processing init');
}

ProcessingRequests.prototype.Login = function(parseData) {
    clientId = parseData.client;
    console.dir('Login');
    // return JSON.stringify(['Error', {err_mess: 'error'}]);
    return JSON.stringify(["Login", { "code": "SUCCESS", "message": null }]);
    // ["Login", {"code":"SUCCESS","message":null}]
}

ProcessingRequests.prototype.GetAccounts = function(parseData) {
    var arr = ['Accounts'],
        accounts = dataObj.GetAccounts[1].filter(function(item) {
            return item.client === parseData.client;
        });
    console.log(JSON.stringify(accounts));
    arr.push(accounts[0]);
    return JSON.stringify(arr);
}

ProcessingRequests.prototype.UpdateAccount = function(parseData) {
    var arr = ['Account'],
        client = getActualOrg(),
        account = client.accounts.filter(function(item) {
            return item.id === parseData.id;
        });
    arr.push(account[0]);
    return JSON.stringify(arr);
}

ProcessingRequests.prototype.UnSubRate = function(parseData) {
    clearInterval(idTimerGenerateOneRate);
    return JSON.stringify(['UnSubRate', {result: 0}]);
}

ProcessingRequests.prototype.SubRate = function(parseData, connection) {
    
    var arr = ['SubRate'],
        dataSer = currencyConst.filter(function(item) {
            return item.sym === parseData.sym;
        });
    dataSer = dataSer[0];
    idTimerGenerateOneRate = setInterval(function() {
        arr[1] = new objRate(getRandomRate(dataSer.rates.buy.min, dataSer.rates.buy.max), getRandomRate(dataSer.rates.sell.min, dataSer.rates.sell.max), parseData.s, null, parseData.sym, parseData.client);
        connection.sendUTF(JSON.stringify(arr));
    }, 1000);
    setTimeout(function() {
        clearInterval(idTimerGenerateOneRate);
    }, 60000);
    
    return true;
}

ProcessingRequests.prototype.GetRate = function(parseData) {
    var arr = ['GetRate', []],
        item,
        i,
        time = generateTime();
    for (i = 0; i < 3; i++) {
        item = currencyConst[i];
        arr[1].push(new objRate(getRandomRate(item.rates.buy.min, item.rates.buy.max), getRandomRate(item.rates.sell.min, item.rates.sell.max), 300000, time, item.sym));
    }
    return JSON.stringify(arr);
}

ProcessingRequests.prototype.Hold = function(parseData) {
    var arr = ['Account'],
        client,
        amountHold = parseData.hold,
        itemNum = -1,
        dataSer;

    client = getActualOrg();
    console.log('client');
    console.log(client);
    dataSer = client.accounts.filter(function(item, key) {
        if (item.id === parseData.id) {
            itemNum = key;
        }
        return item.id === parseData.id;
    });
    if (amountHold * 1 > 0) {
        dataSer[0].hold = dataSer[0].hold * 1 + parseData.hold * 1;
    } else {
        dataSer[0].hold = 0;
    }
    dataObj.GetAccounts[1][clientNum].accounts[itemNum].hold = String(dataSer[0].hold);
    arr[1] = dataSer[0];
    return JSON.stringify(arr);
}

ProcessingRequests.prototype.HoldError = function(parseData) {
    var arr = ['HoldError'];
    return JSON.stringify(arr);
}

ProcessingRequests.prototype.Order = function(parseData) {
    var arr = ['GetOrderStatus'];
    arr[1] = {
        id: parseData.id,
        // status: 'PENDING'
        status: 'SUCCESS'
            // status: 'REJECTED'
    };
    return JSON.stringify(arr);
}
ProcessingRequests.prototype.GetOrderStatus = function(parseData) {
    var arr = ['GetOrderStatus'];
    arr[1] = {
        id: parseData.id,
        // status: 'PENDING'
        status: 'SUCCESS'
            // status: 'REJECTED'
    };
    return JSON.stringify(arr);
}

ProcessingRequests.prototype.InputMessage = function(parseData) {

};

var processing = new ProcessingRequests();
/*********************************************************************************/

wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin 
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    }
    var connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Connection accepted.');

    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);
            connection.sendUTF(validateMes(message.utf8Data, connection));
        }
    });
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        console.log('description = ' + description);
    });
    connection.on('open', function(data) {
        console.log('user connection');
    });
});



function generateTime() {
    var date,
        d = new Date(),
        nowH = (d.getHours() < 10) ? '0' + d.getHours() : d.getHours(),
        nowMin = (d.getMinutes() < 10) ? '0' + d.getMinutes() : d.getMinutes();
    nowSec = (d.getSeconds() < 10) ? '0' + d.getSeconds() : d.getSeconds();
    date = nowH + ':' + nowMin + ':' + nowSec;
    return date;
}

function objRate(a, b, s, t, sym, client) {
    this.a = a;
    this.b = b;
    this.s = s;
    this.t = t;
    this.sym = sym;
    this.client = client;
}

function validateMes(message, connection) {
    var parseData = JSON.parse(message),
        nameRequest = parseData[0];
    console.log('================= '+ nameRequest);
    if (typeof processing[nameRequest] === 'function') {
        console.log(idTimerGenerateOneRate);
        return processing[nameRequest](parseData[1], connection);
    }
};

function findActiveData(sym) {
    var dataFromServer = currencyConst.filter(function(item) {
        return item.sym === sym;
    });
    return dataFromServer[0];
}

function getRandomRate(min, max) {
    // var rate = (min + Math.random()) * (max - min);
    var rate = Math.random() * (max - min + 1) + min;
    return rate.toFixed(3);
}