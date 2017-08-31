
// retrieve passed arguments
var input = process.argv.slice(2, process.argv.length - 1)

// reformat input
var data = JSON.parse(input.join())
var items = data.vout[0].items

if (items.length > 0) {

    item = items[0]
    if (item['type'] === "stream")  {

        if ((item['name'] === "data") || (item['name'] === "job") || (item['name'] === "buy")) {
            var message = {"full_size": items.length, "data": item};
            var request = require("request");

            switch(item['name']) {
                case "data":
                    url = 'http://localhost:9090/sync'
                    break;
                case "job":
                    url = 'http://localhost:9090/sync'
                    break;
                case "buy":
                    url = 'http://localhost:9090/sell'
                    break;
            }

            var options = {
                method: 'POST',
                url: url,
                headers: {
                    'cache-control': 'no-cache',
                    'content-type': 'application/json'
                },
                body: message,
                json: true
            };

            request(options, function (error, response, body) {
              if (error) throw new Error(error);
              console.log(body);
            });
        }
    }
}
