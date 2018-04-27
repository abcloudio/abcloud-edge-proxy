### A/B Cloud - AWS Cloudfront edge proxy

A Lambda@Edge function used to enable a/b testing, canary releasing, and gatekeeping.

### Usage

`npm install --save abcloud-edge-proxy`

Deploy as an Edge Lambda function, within an AWS Cloudfront distribution, for the `viewer-request` event.

All assignments are done deterministically, by hashing a salt and visitor Id. On every visit the proxy creates a unique request id (using `uuid/v4`) and forwards this to the origin as a `request-id` header. On first visits the proxy will use this id as the assignment id. To assure consistent hashing your application MUST set a `_vq` cookie with this value. On the first request the value of this cookie should be set from the `request-id` header and on subsequent visits it should come from the `_vq` cookie (not from the request-id header). For example, in an `express` app, that might be done as follows:

```js
// set or reset the visitor ID cookie
res.cookie("_vq", req.cookies["_vq"] || req.headers["request-id"], {
    maxAge: 3600 * 1000 * 24 * 365
});
```

#### A/B/N Testing Example

```js
import edgeProxy from "abcloud-edge-proxy";

const config = {
    defaultBackend: {
        domainName: "blue.my-site.com"
    },
    origins: [
        {
            domainName: "blue.my-site.com"
        },
        {
            domainName: "green.my-site.com"
        },
        {
            domainName: "red.my-site.com"
        }
    ],
    salt: "unique-assignment-salt",
    test: true
};

exports.handler = edgeProxy(config);
```

When configuring backends you may use any of the cloudfront parameters, as shown below. Only `domainName` is required. Current defaults are shown below.

```js
{
    domainName: "required.com",
    port: 443,
    protocol: "https",
    path: "",
    sslProtocols: ["TLSv1", "TLSv1.1"],
    readTimeout: 5,
    keepaliveTimeout: 30,
    customHeaders: {}
};
```

#### Canary Releasing Example

Canary releasing can be used to gradually shift traffic from one backend to another. It should ONLY be used with two backends, (unlike a/b/n testing), so that users do not get reassigned as the traffic percentage is increased. An example config is shown below. To assure consistent assignment, for visitors, the `weight` parameter should only be increased.

```js
import edgeProxy from "edge-proxy";

const config = {
    defaultBackend: {
        domainName: "blue.my-site.com",
    }
    canaryBackend: {
        domainName: "green.my-site.com"
    },
    salt: "unique-assignment-salt",
    canary: true,
    weight: 50 // an integer from 0-100 specifying
    // the percentage of traffic to allocate to the
    // canary backend
};

exports.handler = edgeProxy(config);
```

#### Gatekeeping

To enable gatekeeping, you must pass a `JWT_SECRET_KEY` with the config.

```js
import edgeProxy from "edge-proxy";

const config = {
    JWT_SECRET_KEY: process.env["JWT_SECRET_KEY"]
    /* ... */
};

exports.handler = edgeProxy(config);
```

You can then encode desired backends into a JWT with your secret and then access your root domain with the JWT set as a query parameter `?devtoken=JWT` or as a cookie `devtoken=JWT`. This allows for ANY backend to be accessed through the proxy and can be useful for developing / testing, on your production domain, without having to update the proxy to add development backends.

An example of creating such a token is shown below.

```js
var jwttoken = require("jsonwebtoken");

const devtoken = jwttoken.sign(
    {
        domainName: "your-desired-backend.com"
        // optional parameters
        // port: 443,
        // protocol: "https",
        // path: "/test",
        // sslProtocols: ["TLSv1", "TLSv1.1"],
        // readTimeout: 60,
        // keepaliveTimeout: 60,
        // customHeaders: {}
    },
    process.env["JWT_SECRET_KEY"]
);

console.log(devtoken);
```

#### Echoer

To enable the echoer, you must pass an `ECHO_TOKEN` with the config. You may then access `/proxy-echo?echotoken=ECHO_TOKEN` and you will get the `request` object (after modification) returned as formatted JSON. Useful for debugging.

```js
import edgeProxy from "edge-proxy";

const config = {
    ECHO_TOKEN: process.env["ECHO_TOKEN"]
    /* ... */
};

exports.handler = edgeProxy(config);
```

#### Building with Webpack

Example building with `webpack`. Note that edge functions do not currently support environment variables, so we are using webpack to build them into our deployment package.

```js
var path = require("path");
var webpack = require("webpack");

module.exports = {
    entry: {
        proxy: path.join(__dirname, "/index.js")
    },
    output: {
        path: path.join(__dirname, "dist"),
        filename: "edge-proxy-lambda.js",
        libraryTarget: "commonjs"
    },
    target: "node",
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules)/,
                use: {
                    loader: "babel-loader"
                }
            }
        ]
    },
    plugins: [
        // env vars
        new webpack.DefinePlugin({
            "process.env": {
                JWT_SECRET_KEY: JSON.stringify(process.env["JWT_SECRET_KEY"]),
                ECHO_TOKEN: JSON.stringify(process.env["ECHO_TOKEN"])
            }
        })
    ]
};
```

After building with `webpack` zip the function and deploy to AWS.
