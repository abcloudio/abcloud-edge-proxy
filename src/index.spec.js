import edgeProxy from ".";

jest.mock("uuid/v4", () => {
    return jest.fn().mockImplementation(() => {
        return "mock-uuid";
    });
});

describe("Gatekeeping", () => {
    it("Uses the backend set in the JWT token or cookie for gatekeeping", () => {
        //
        var jwttoken = require("jsonwebtoken");
        const JWT_SECRET_KEY = "abc-123";
        const backend = {
            domainName: "gatekeeping-domain.com",
            port: 443,
            protocol: "https",
            path: "/test",
            sslProtocols: ["TLSv1", "TLSv1.1"],
            readTimeout: 60,
            keepaliveTimeout: 60,
            customHeaders: {}
        };
        const devtoken = jwttoken.sign(backend, JWT_SECRET_KEY, {
            expiresIn: "1h"
        });

        // prettier-ignore
        const mockEvent = {Records:[{cf:{config:{distributionId:"EDFDVBD6EXAMPLE",requestId:"MRVMF7KydIvxMWfJIglgwHQwZsbG2IhRJ07sn9AkKUFSHS9EXAMPLE=="},request:{clientIp:"0.0.0.0",querystring:`devtoken=${devtoken}`,uri:"",method:"GET",headers:{host:[{key:"Host",value:"d111111abcdef8.cloudfront.net"}],"user-agent":[{key:"User-Agent",value:"curl/7.51.0"}]},origin:{custom:{customHeaders:{"my-origin-custom-header":[{key:"My-Origin-Custom-Header",value:"Test"}]},domainName:"example.com",keepaliveTimeout:5,path:"/custom_path",port:443,protocol:"https",readTimeout:5,sslProtocols:["TLSv1","TLSv1.1"]}}}}}]};

        const config = {
            JWT_SECRET_KEY: "abc-123",
            defaultBackend: {
                domainName: "blue.my-site.com"
            }
        };

        const lambdaFunction = edgeProxy(config);

        // Test with JWT in the query string
        lambdaFunction(mockEvent, {}, (error, modifiedRequestForOrigin) => {
            // prettier-ignore
            expect(modifiedRequestForOrigin).toEqual({"clientIp": "0.0.0.0", "headers": {"host": [{"key": "host", "value": backend.domainName}], "user-agent": [{"key": "User-Agent", "value": "curl/7.51.0"}]}, "method": "GET", "origin": {"custom": {...backend, customHeaders: {"my-origin-custom-header": [{"key": "My-Origin-Custom-Header", "value": "Test"}]}}}, "querystring": `devtoken=${devtoken}`, "uri": ""})
        });

        // prettier-ignore
        const mockEventWithCookie = {Records:[{cf:{config:{distributionId:"EDFDVBD6EXAMPLE",requestId:"MRVMF7KydIvxMWfJIglgwHQwZsbG2IhRJ07sn9AkKUFSHS9EXAMPLE=="},request:{clientIp:"0.0.0.0",querystring:``,uri:"",method:"GET",headers:{host:[{key:"Host",value:"d111111abcdef8.cloudfront.net"}],cookie:[{key:"Cookie",value:`devtoken=${devtoken}`}],"user-agent":[{key:"User-Agent",value:"curl/7.51.0"}]},origin:{custom:{customHeaders:{"my-origin-custom-header":[{key:"My-Origin-Custom-Header",value:"Test"}]},domainName:"example.com",keepaliveTimeout:5,path:"/custom_path",port:443,protocol:"https",readTimeout:5,sslProtocols:["TLSv1","TLSv1.1"]}}}}}]};

        // Test with JWT in a cookie
        lambdaFunction(
            mockEventWithCookie,
            {},
            (error, modifiedRequestForOrigin) => {
                // prettier-ignore
                expect(modifiedRequestForOrigin).toEqual({"clientIp": "0.0.0.0", "headers": {"host": [{"key": "host", "value": backend.domainName}], "user-agent": [{"key": "User-Agent", "value": "curl/7.51.0"}],cookie:[{key:"Cookie",value:`devtoken=${devtoken}`}]}, "method": "GET", "origin": {"custom": {...backend, customHeaders: {"my-origin-custom-header": [{"key": "My-Origin-Custom-Header", "value": "Test"}]}}}, "querystring": "", "uri": ""})
            }
        );
    });

    it("Invalid devtoken goes to the default backend", () => {
        //
        const devtoken = "invalid-token";
        // prettier-ignore
        const mockEvent = {Records:[{cf:{config:{distributionId:"EDFDVBD6EXAMPLE",requestId:"MRVMF7KydIvxMWfJIglgwHQwZsbG2IhRJ07sn9AkKUFSHS9EXAMPLE=="},request:{clientIp:"0.0.0.0",querystring:`devtoken=${devtoken}`,uri:"",method:"GET",headers:{host:[{key:"Host",value:"d111111abcdef8.cloudfront.net"}],"user-agent":[{key:"User-Agent",value:"curl/7.51.0"}]},origin:{custom:{customHeaders:{"my-origin-custom-header":[{key:"My-Origin-Custom-Header",value:"Test"}]},domainName:"example.com",keepaliveTimeout:5,path:"/custom_path",port:443,protocol:"https",readTimeout:5,sslProtocols:["TLSv1","TLSv1.1"]}}}}}]};

        const config = {
            JWT_SECRET_KEY: "abc-123",
            defaultBackend: {
                domainName: "blue.my-site.com"
            }
        };

        const lambdaFunction = edgeProxy(config);

        // Test with JWT in the query string
        lambdaFunction(mockEvent, {}, (error, modifiedRequestForOrigin) => {
            // prettier-ignore
            expect(modifiedRequestForOrigin).toEqual({"clientIp": "0.0.0.0", "headers": {"host": [{"key": "host", "value": config.defaultBackend.domainName}], "user-agent": [{"key": "User-Agent", "value": "curl/7.51.0"}]}, "method": "GET", "origin": {"custom": {"domainName": config.defaultBackend.domainName, "port":443, "protocol": "https", "path":"","sslProtocols":["TLSv1","TLSv1.1"],"readTimeout":5,"keepaliveTimeout":30,"customHeaders":{"my-origin-custom-header":[{key:"My-Origin-Custom-Header",value:"Test"}]}}}, "querystring": `devtoken=${devtoken}`, "uri": ""})
        });
    });
});

describe("A/B/N Testing", () => {
    it("Consistently serves the same version for the same _vq cookie value for a/b/n testing", () => {
        // prettier-ignore
        const mockEvent = {Records:[{cf:{config:{distributionId:"EDFDVBD6EXAMPLE",requestId:"MRVMF7KydIvxMWfJIglgwHQwZsbG2IhRJ07sn9AkKUFSHS9EXAMPLE=="},request:{clientIp:"0.0.0.0",querystring:``,uri:"",method:"GET",headers:{host:[{key:"Host",value:"d111111abcdef8.cloudfront.net"}],cookie:[{key:"Cookie",value:`_vq=a-user-id-123-abc`}],"user-agent":[{key:"User-Agent",value:"curl/7.51.0"}]},origin:{custom:{customHeaders:{"my-origin-custom-header":[{key:"My-Origin-Custom-Header",value:"Test"}]},domainName:"example.com",keepaliveTimeout:5,path:"/custom_path",port:443,protocol:"https",readTimeout:5,sslProtocols:["TLSv1","TLSv1.1"]}}}}}]};

        const config = {
            JWT_SECRET_KEY: "abc-123",
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

        const lambdaFunction = edgeProxy(config);

        // first run with _vq cookie set
        lambdaFunction(mockEvent, {}, (error, modifiedRequestForOrigin) => {
            // prettier-ignore
            expect(modifiedRequestForOrigin).toEqual({"clientIp":"0.0.0.0","querystring":"","uri":"","method":"GET","headers":{"cookie": [{"key": "Cookie", "value": "_vq=a-user-id-123-abc"}], "host":[{"key":"host","value":"blue.my-site.com"}], "user-agent":[{"key":"User-Agent","value":"curl/7.51.0"}], "request-id":[{"key":"request-id","value":"mock-uuid"}]},"origin":{"custom":{"domainName":"blue.my-site.com","port":443,"protocol":"https","path":"","sslProtocols":["TLSv1","TLSv1.1"],"readTimeout":5,"keepaliveTimeout":30,"customHeaders":{"my-origin-custom-header":[{key:"My-Origin-Custom-Header",value:"Test"}]}}}})
        });

        // second run with _vq cookie set
        lambdaFunction(mockEvent, {}, (error, modifiedRequestForOrigin) => {
            // prettier-ignore
            expect(modifiedRequestForOrigin).toEqual({"clientIp":"0.0.0.0","querystring":"","uri":"","method":"GET","headers":{"cookie": [{"key": "Cookie", "value": "_vq=a-user-id-123-abc"}], "host":[{"key":"host","value":"blue.my-site.com"}], "user-agent":[{"key":"User-Agent","value":"curl/7.51.0"}], "request-id":[{"key":"request-id","value":"mock-uuid"}]},"origin":{"custom":{"domainName":"blue.my-site.com","port":443,"protocol":"https","path":"","sslProtocols":["TLSv1","TLSv1.1"],"readTimeout":5,"keepaliveTimeout":30,"customHeaders":{"my-origin-custom-header":[{key:"My-Origin-Custom-Header",value:"Test"}]}}}})
        });

        // third run with _vq cookie set
        lambdaFunction(mockEvent, {}, (error, modifiedRequestForOrigin) => {
            // prettier-ignore
            expect(modifiedRequestForOrigin).toEqual({"clientIp":"0.0.0.0","querystring":"","uri":"","method":"GET","headers":{"cookie": [{"key": "Cookie", "value": "_vq=a-user-id-123-abc"}], "host":[{"key":"host","value":"blue.my-site.com"}], "user-agent":[{"key":"User-Agent","value":"curl/7.51.0"}], "request-id":[{"key":"request-id","value":"mock-uuid"}]},"origin":{"custom":{"domainName":"blue.my-site.com","port":443,"protocol":"https","path":"","sslProtocols":["TLSv1","TLSv1.1"],"readTimeout":5,"keepaliveTimeout":30,"customHeaders":{"my-origin-custom-header":[{key:"My-Origin-Custom-Header",value:"Test"}]}}}})
        });
    });

    it("Hashes to a backends and sets a header for request-id", () => {
        // prettier-ignore
        const mockEvent = {Records:[{cf:{config:{distributionId:"EDFDVBD6EXAMPLE",requestId:"MRVMF7KydIvxMWfJIglgwHQwZsbG2IhRJ07sn9AkKUFSHS9EXAMPLE=="},request:{clientIp:"2001:0db8:85a3:0:0:8a2e:0370:7334",querystring:"",uri:"",method:"GET",headers:{host:[{key:"Host",value:"d111111abcdef8.cloudfront.net"}],"user-agent":[{key:"User-Agent",value:"curl/7.51.0"}]},origin:{custom:{customHeaders:{"my-origin-custom-header":[{key:"My-Origin-Custom-Header",value:"Test"}]},domainName:"example.com",keepaliveTimeout:5,path:"/custom_path",port:443,protocol:"https",readTimeout:5,sslProtocols:["TLSv1","TLSv1.1"]}}}}}]};

        const config = {
            JWT_SECRET_KEY: "abc-123",
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

        const lambdaFunction = edgeProxy(config);

        lambdaFunction(mockEvent, {}, (error, modifiedRequestForOrigin) => {
            // prettier-ignore
            expect(modifiedRequestForOrigin).toEqual({"clientIp":"2001:0db8:85a3:0:0:8a2e:0370:7334","querystring":"","uri":"","method":"GET","headers":{"host":[{"key":"host","value":"green.my-site.com"}],"user-agent":[{"key":"User-Agent","value":"curl/7.51.0"}],"request-id":[{"key":"request-id","value":"mock-uuid"}]},"origin":{"custom":{"domainName":"green.my-site.com","port":443,"protocol":"https","path":"","sslProtocols":["TLSv1","TLSv1.1"],"readTimeout":5,"keepaliveTimeout":30,"customHeaders":{"my-origin-custom-header":[{key:"My-Origin-Custom-Header",value:"Test"}]}}}})
        });
    });
});

describe("Canary Releasing", () => {
    it("Selects canary backend with weight 100 & overwrites customHeader that was set in cloudfront", () => {
        // prettier-ignore
        const mockEvent = {Records:[{cf:{config:{distributionId:"EDFDVBD6EXAMPLE",requestId:"MRVMF7KydIvxMWfJIglgwHQwZsbG2IhRJ07sn9AkKUFSHS9EXAMPLE=="},request:{clientIp:"0.0.0.0",querystring:"",uri:"",method:"GET",headers:{host:[{key:"Host",value:"d111111abcdef8.cloudfront.net"}],"user-agent":[{key:"User-Agent",value:"curl/7.51.0"}]},origin:{custom:{customHeaders:{"my-origin-custom-header":[{key:"My-Origin-Custom-Header",value:"Test"}], "cf-test": [{key:"cf-test",value:"set-in-cloudfront"}]}, domainName:"example.com",keepaliveTimeout:5,path:"/custom_path",port:443,protocol:"https",readTimeout:5,sslProtocols:["TLSv1","TLSv1.1"]}}}}}]};

        const config = {
            JWT_SECRET_KEY: "abc-123",
            defaultBackend: {
                domainName: "blue.my-site.com"
            },
            canaryBackend: {
                domainName: "green.my-site.com",
                customHeaders: {
                    "cf-test": [
                        { key: "cf-test", value: "replace value from config" }
                    ]
                }
            },
            salt: "unique-assignment-salt",
            canary: true,
            weight: 100
        };

        const lambdaFunction = edgeProxy(config);

        // Test with JWT in the query string
        lambdaFunction(mockEvent, {}, (error, modifiedRequestForOrigin) => {
            // prettier-ignore
            expect(modifiedRequestForOrigin).toEqual({"clientIp": "0.0.0.0", "headers": {"host": [{"key": "host", "value": config.canaryBackend.domainName}], "user-agent": [{"key": "User-Agent", "value": "curl/7.51.0"}],"request-id":[{"key":"request-id","value":"mock-uuid"}]}, "method": "GET", "origin": {"custom": {"domainName": config.canaryBackend.domainName, "port":443, "protocol": "https", "path":"", "sslProtocols":["TLSv1","TLSv1.1"], "readTimeout":5,"keepaliveTimeout":30, "customHeaders":{"my-origin-custom-header":[{key:"My-Origin-Custom-Header",value:"Test"}], "cf-test":[{key:"cf-test",value:"replace value from config"}]}}}, "querystring": "", "uri": ""})
        });
    });

    it("Consistently serves the same version for the same _vq cookie value for canary releasing", () => {
        // prettier-ignore
        const mockEvent = {Records:[{cf:{config:{distributionId:"EDFDVBD6EXAMPLE",requestId:"MRVMF7KydIvxMWfJIglgwHQwZsbG2IhRJ07sn9AkKUFSHS9EXAMPLE=="},request:{clientIp:"0.0.0.0",querystring:"",uri:"",method:"GET",headers:{host:[{key:"Host",value:"d111111abcdef8.cloudfront.net"}],cookie:[{key:"Cookie",value:`_vq=a-user-id-123-abc`}],"user-agent":[{key:"User-Agent",value:"curl/7.51.0"}]},origin:{custom:{customHeaders:{"my-origin-custom-header":[{key:"My-Origin-Custom-Header",value:"Test"}], "cf-test": [{key:"cf-test",value:"set-in-cloudfront"}]}, domainName:"example.com",keepaliveTimeout:5,path:"/custom_path",port:443,protocol:"https",readTimeout:5,sslProtocols:["TLSv1","TLSv1.1"]}}}}}]};

        const config = {
            JWT_SECRET_KEY: "abc-123",
            defaultBackend: {
                domainName: "blue.my-site.com"
            },
            canaryBackend: {
                domainName: "green.my-site.com"
            },
            salt: "unique-assignment-salt",
            canary: true,
            weight: 50
        };

        const lambdaFunction = edgeProxy(config);

        // First run
        lambdaFunction(mockEvent, {}, (error, modifiedRequestForOrigin) => {
            // prettier-ignore
            expect(modifiedRequestForOrigin).toEqual({"clientIp": "0.0.0.0", "headers": {"cookie": [{"key": "Cookie", "value": "_vq=a-user-id-123-abc"}], "host": [{"key": "host", "value": config.canaryBackend.domainName}], "user-agent": [{"key": "User-Agent", "value": "curl/7.51.0"}],"request-id":[{"key":"request-id","value":"mock-uuid"}]}, "method": "GET", "origin": {"custom": {"domainName": config.canaryBackend.domainName, "port":443, "protocol": "https", "path":"", "sslProtocols":["TLSv1","TLSv1.1"], "readTimeout":5,"keepaliveTimeout":30, "customHeaders":{"my-origin-custom-header":[{key:"My-Origin-Custom-Header",value:"Test"}], "cf-test":[{key:"cf-test",value:"set-in-cloudfront"}]}}}, "querystring": "", "uri": ""})
        });

        // Second run
        lambdaFunction(mockEvent, {}, (error, modifiedRequestForOrigin) => {
            // prettier-ignore
            expect(modifiedRequestForOrigin).toEqual({"clientIp": "0.0.0.0", "headers": {"cookie": [{"key": "Cookie", "value": "_vq=a-user-id-123-abc"}], "host": [{"key": "host", "value": config.canaryBackend.domainName}], "user-agent": [{"key": "User-Agent", "value": "curl/7.51.0"}],"request-id":[{"key":"request-id","value":"mock-uuid"}]}, "method": "GET", "origin": {"custom": {"domainName": config.canaryBackend.domainName, "port":443, "protocol": "https", "path":"", "sslProtocols":["TLSv1","TLSv1.1"], "readTimeout":5,"keepaliveTimeout":30, "customHeaders":{"my-origin-custom-header":[{key:"My-Origin-Custom-Header",value:"Test"}], "cf-test":[{key:"cf-test",value:"set-in-cloudfront"}]}}}, "querystring": "", "uri": ""})
        });
    });

    it("Allows for increasing percentage to canary without losing prior assignments", () => {
        // covered by test within show-canary library
    });

    it("Assigns canary backends according to the given weight (rounded for the test)", () => {
        // covered by test within show-canary library
    });
});

describe("SEOTest", () => {
    it("Consistently routes to the same backend for the same URI, for SEO a/b/n testing", () => {
        // prettier-ignore
        const mockEvent = {Records:[{cf:{config:{distributionId:"EDFDVBD6EXAMPLE",requestId:"MRVMF7KydIvxMWfJIglgwHQwZsbG2IhRJ07sn9AkKUFSHS9EXAMPLE=="},request:{clientIp:"0.0.0.0",querystring:"",uri:"/some-path/on/site",method:"GET",headers:{host:[{key:"Host",value:"d111111abcdef8.cloudfront.net"}],cookie:[{key:"Cookie",value:`_vq=a-user-id-123-abc`}],"user-agent":[{key:"User-Agent",value:"curl/7.51.0"}]},origin:{custom:{customHeaders:{"my-origin-custom-header":[{key:"My-Origin-Custom-Header",value:"Test"}], "cf-test": [{key:"cf-test",value:"set-in-cloudfront"}]}, domainName:"example.com",keepaliveTimeout:5,path:"/custom_path",port:443,protocol:"https",readTimeout:5,sslProtocols:["TLSv1","TLSv1.1"]}}}}}]};

        const config = {
            JWT_SECRET_KEY: "abc-123",
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
            SEOTest: true
        };

        const lambdaFunction = edgeProxy(config);

        // First run
        lambdaFunction(mockEvent, {}, (error, modifiedRequestForOrigin) => {
            // prettier-ignore
            expect(modifiedRequestForOrigin).toEqual({"clientIp": "0.0.0.0", "headers": {"cookie": [{"key": "Cookie", "value": "_vq=a-user-id-123-abc"}], "host": [{"key": "host", "value": "green.my-site.com"}], "user-agent": [{"key": "User-Agent", "value": "curl/7.51.0"}],"request-id":[{"key":"request-id","value":"mock-uuid"}]}, "method": "GET", "origin": {"custom": {"domainName": "green.my-site.com", "port":443, "protocol": "https", "path":"", "sslProtocols":["TLSv1","TLSv1.1"], "readTimeout":5,"keepaliveTimeout":30, "customHeaders":{"my-origin-custom-header":[{key:"My-Origin-Custom-Header",value:"Test"}], "cf-test":[{key:"cf-test",value:"set-in-cloudfront"}]}}}, "querystring": "", "uri": "/some-path/on/site"})
        });

        // Second run
        lambdaFunction(mockEvent, {}, (error, modifiedRequestForOrigin) => {
            // prettier-ignore
            expect(modifiedRequestForOrigin).toEqual({"clientIp": "0.0.0.0", "headers": {"cookie": [{"key": "Cookie", "value": "_vq=a-user-id-123-abc"}], "host": [{"key": "host", "value": "green.my-site.com"}], "user-agent": [{"key": "User-Agent", "value": "curl/7.51.0"}],"request-id":[{"key":"request-id","value":"mock-uuid"}]}, "method": "GET", "origin": {"custom": {"domainName":"green.my-site.com", "port":443, "protocol": "https", "path":"", "sslProtocols":["TLSv1","TLSv1.1"], "readTimeout":5,"keepaliveTimeout":30, "customHeaders":{"my-origin-custom-header":[{key:"My-Origin-Custom-Header",value:"Test"}], "cf-test":[{key:"cf-test",value:"set-in-cloudfront"}]}}}, "querystring": "", "uri": "/some-path/on/site"})
        });
    });
});

describe("Echo", () => {
    // This test is flaky for some reason... seems to work but it's like it gets called twice
    it("Echos the request object for /proxy-echo path with a token", () => {
        const echotoken = "abcdef";

        // prettier-ignore
        const mockEvent = {Records:[{cf:{config:{distributionId:"EDFDVBD6EXAMPLE",requestId:"MRVMF7KydIvxMWfJIglgwHQwZsbG2IhRJ07sn9AkKUFSHS9EXAMPLE=="},request:{clientIp:"0.0.0.0",querystring:`echotoken=${echotoken}`,uri:"/proxy-echo",method:"GET",headers:{host:[{key:"Host",value:"d111111abcdef8.cloudfront.net"}],"user-agent":[{key:"User-Agent",value:"curl/7.51.0"}]},origin:{custom:{customHeaders:{"my-origin-custom-header":[{key:"My-Origin-Custom-Header",value:"Test"}], "cf-test": [{key:"cf-test",value:"set-in-cloudfront"}]}, domainName:"example.com",keepaliveTimeout:5,path:"/custom_path",port:443,protocol:"https",readTimeout:5,sslProtocols:["TLSv1","TLSv1.1"]}}}}}]};

        const config = {
            ECHO_TOKEN: echotoken,
            defaultBackend: {
                domainName: "blue.my-site.com"
            }
        };

        const lambdaFunction = edgeProxy(config);

        lambdaFunction(mockEvent, {}, (error, responseBody) => {
            expect(responseBody.body.substring(0, 5)).toEqual("<pre>");
            expect(responseBody.status).toEqual("200");
        });
    });

    it("Does not echo the request object for /proxy-echo without a token or a valid token", () => {
        const echotoken = "invalid";

        // prettier-ignore
        const mockEvent = {Records:[{cf:{config:{distributionId:"EDFDVBD6EXAMPLE",requestId:"MRVMF7KydIvxMWfJIglgwHQwZsbG2IhRJ07sn9AkKUFSHS9EXAMPLE=="},request:{clientIp:"0.0.0.0",querystring:`echotoken=${echotoken}`,uri:"/proxy-echo",method:"GET",headers:{host:[{key:"Host",value:"d111111abcdef8.cloudfront.net"}],"user-agent":[{key:"User-Agent",value:"curl/7.51.0"}]},origin:{custom:{customHeaders:{"my-origin-custom-header":[{key:"My-Origin-Custom-Header",value:"Test"}], "cf-test": [{key:"cf-test",value:"set-in-cloudfront"}]}, domainName:"example.com",keepaliveTimeout:5,path:"/custom_path",port:443,protocol:"https",readTimeout:5,sslProtocols:["TLSv1","TLSv1.1"]}}}}}]};

        const config = {
            ECHO_TOKEN: "valid-token",
            defaultBackend: {
                domainName: "blue.my-site.com"
            }
        };

        const lambdaFunction = edgeProxy(config);

        lambdaFunction(mockEvent, {}, (error, responseBody) => {
            // prettier-ignore
            expect(responseBody).toEqual({"clientIp": "0.0.0.0", "headers": {"host": [{"key": "host", "value": "blue.my-site.com"}], "request-id": [{"key": "request-id", "value": "mock-uuid"}], "user-agent": [{"key": "User-Agent", "value": "curl/7.51.0"}]}, "method": "GET", "origin": {"custom": {"customHeaders": {"cf-test": [{"key": "cf-test", "value": "set-in-cloudfront"}], "my-origin-custom-header": [{"key": "My-Origin-Custom-Header", "value": "Test"}]}, "domainName": "blue.my-site.com", "keepaliveTimeout": 30, "path": "", "port": 443, "protocol": "https", "readTimeout": 5, "sslProtocols": ["TLSv1", "TLSv1.1"]}}, "querystring": "echotoken=invalid", "uri": "/proxy-echo"}
    );
        });
    });
});
