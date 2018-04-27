// lambda.js
"use strict";
import uniformIndex from "assign-uniform";
import showCanary from "show-canary";
const uuid = require("uuid/v4");
const querystring = require("querystring");
const jwttoken = require("jsonwebtoken");
const cookie = require("cookie");

// this allows us full control over our a/b/n origins witht the ability to specify
// any number of custom origin parameters. Sensible defaults are provided such that only
// the domainName may be specified for it to work.
const prepareOrigin = (
    {
        domainName,
        port = 443,
        protocol = "https",
        path = "",
        sslProtocols = ["TLSv1", "TLSv1.1"],
        readTimeout = 5,
        keepaliveTimeout = 30,
        customHeaders = {}
    },
    customHeadersFromCf = {}
) => ({
    custom: {
        domainName,
        port,
        protocol,
        path,
        sslProtocols,
        readTimeout,
        keepaliveTimeout,
        // overwrite any custom headers, that may be in the CF distribution, with those from our configs
        customHeaders: { ...customHeadersFromCf, ...customHeaders }
    }
});

export default config => {
    return (event, context, callback) => {
        const request = event.Records[0].cf.request;
        const headers = request.headers;

        // parse cookies and querystring to check for jwt
        const params = querystring.parse(request.querystring || "");
        const cookies = cookie.parse(
            (headers.cookie || [{ value: "" }])[0].value || ""
        );

        const customHeadersFromCf =
            ((request.origin || {}).custom || {}).customHeaders || {};

        // this is the gatekeeping / ab testing playground, from here we can send the request to
        // anywhere in the world (literarlly)
        // this takes the origin "gatekeeping" information from the jwt and
        // point the domain there, probably client side we should save the jwt in a cookie
        if (
            (config.JWT_SECRET_KEY && params.devtoken) ||
            (config.JWT_SECRET_KEY && cookies.devtoken)
        ) {
            // maybe we simplify and just use or set a single token and then differentiate within the token
            try {
                // attempt to validate the jwt
                const data = jwttoken.verify(
                    params.devtoken || cookies.devtoken,
                    config.JWT_SECRET_KEY
                );
                // set the custom origin based on the data within the jwt
                request.origin = prepareOrigin(data, customHeadersFromCf);

                // we also need to set the host header to match the custom origin for CF to recognize
                headers["host"] = [
                    {
                        key: "host",
                        value: data.domainName
                    }
                ];
                // if the cookie is not set, then set it (and redirect?)
                // if (!cookies.devtoken) {}
            } catch (e) {
                // if dev mode, then return body with error so we can debug?
                // console.log to firebase so we can see in realtime?
                headers["host"] = [
                    { key: "host", value: config.defaultBackend.domainName }
                ];
                request.origin = prepareOrigin(
                    config.defaultBackend,
                    customHeadersFromCf
                );
            }
        } else {
            const requestId = uuid();
            const _vq = cookies["_vq"] || requestId;

            // set the visitor ID value
            headers["request-id"] = [{ key: "request-id", value: requestId }];

            // if no jwt, we run our a/b test or canary release logic
            if (config.test) {
                // run a/b/n test
                const selectedIndex = uniformIndex(
                    `${config.salt}.${_vq}`,
                    config.origins.length
                );
                headers["host"] = [
                    {
                        key: "host",
                        value: config.origins[selectedIndex].domainName
                    }
                ];
                request.origin = prepareOrigin(
                    config.origins[selectedIndex],
                    customHeadersFromCf
                );
            } else if (config.canary) {
                // choose canary or default
                const canaryBoolean = showCanary(
                    `${config.salt}.${_vq}`,
                    config.weight
                );
                headers["host"] = [
                    {
                        key: "host",
                        value: canaryBoolean
                            ? config.canaryBackend.domainName
                            : config.defaultBackend.domainName
                    }
                ];
                request.origin = prepareOrigin(
                    canaryBoolean
                        ? config.canaryBackend
                        : config.defaultBackend,
                    customHeadersFromCf
                );
            } else {
                headers["host"] = [
                    { key: "host", value: config.defaultBackend.domainName }
                ];
                request.origin = prepareOrigin(
                    config.defaultBackend,
                    customHeadersFromCf
                );
            }
        }

        // if we are requesting echo then return a response
        if (
            request.uri === "/proxy-echo" &&
            config.ECHO_TOKEN &&
            params.echotoken === config.ECHO_TOKEN
        ) {
            // allow inspection of the modified request object, should have token for production
            var response = {
                status: "200",
                statusDescription: "OK",
                headers: {
                    "content-type": [
                        {
                            key: "Content-Type",
                            value: "text/html"
                        }
                    ],
                    "content-encoding": [
                        {
                            key: "Content-Encoding",
                            value: "UTF-8"
                        }
                    ]
                },
                body: `<pre>${JSON.stringify(request, null, 4)}</pre>`
            };
            callback(null, response);
        } else {
            // else allow it to go on to the origin
            // call the callback with our updated request object
            callback(null, request);
        }
    };
};
