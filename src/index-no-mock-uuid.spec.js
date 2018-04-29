import edgeProxy from ".";

describe("A/B/N Testing", () => {
    it("Assigns a/b/n backends with reasonably equal weights (rounded for the test)", done => {
        const config = {
            JWT_SECRET_KEY: "abc-123",
            defaultBackend: {
                domainName: "blue.my-site.com"
            },
            origins: [
                {
                    domainName: "blue"
                },
                {
                    domainName: "green"
                },
                {
                    domainName: "red"
                }
            ],
            salt: "unique-assignment-salt",
            test: true
        };

        const lambdaFunction = edgeProxy(config);

        const results = Array.apply(null, { length: 120000 }).map(
            userId =>
                new Promise(res => {
                    // prettier-ignore
                    const mockEvent = {Records:[{cf:{config:{distributionId:"EDFDVBD6EXAMPLE",requestId:"MRVMF7KydIvxMWfJIglgwHQwZsbG2IhRJ07sn9AkKUFSHS9EXAMPLE=="},request:{clientIp:"0.0.0.0",querystring:``,uri:"",method:"GET",headers:{host:[{key:"Host",value:"d111111abcdef8.cloudfront.net"}],"user-agent":[{key:"User-Agent",value:"curl/7.51.0"}]},origin:{custom:{customHeaders:{"my-origin-custom-header":[{key:"My-Origin-Custom-Header",value:"Test"}]},domainName:"example.com",keepaliveTimeout:5,path:"/custom_path",port:443,protocol:"https",readTimeout:5,sslProtocols:["TLSv1","TLSv1.1"]}}}}}]};

                    lambdaFunction(
                        mockEvent,
                        {},
                        (error, modifiedRequestForOrigin) => {
                            res(
                                modifiedRequestForOrigin.origin.custom
                                    .domainName
                            );
                        }
                    );
                })
        );

        return Promise.all(results).then(results => {
            expect(
                Math.round(results.filter(x => x === "red").length / 1000, 0)
            ).toBe(40);
            expect(
                Math.round(results.filter(x => x === "green").length / 1000, 0)
            ).toBe(40);
            expect(
                Math.round(results.filter(x => x === "blue").length / 1000, 0)
            ).toBe(40);
            done();
        });
    });
});

describe("SEOTest", () => {
    it("Ignores the request id and uses the URI, for SEO a/b/n testing", () => {
        const config = {
            JWT_SECRET_KEY: "abc-123",
            defaultBackend: {
                domainName: "blue.my-site.com"
            },
            origins: [
                {
                    domainName: "blue"
                },
                {
                    domainName: "green"
                },
                {
                    domainName: "red"
                }
            ],
            salt: "unique-assignment-salt",
            SEOTest: true
        };

        const lambdaFunction = edgeProxy(config);

        const results = Array.apply(null, { length: 500 }).map(
            userId =>
                new Promise(res => {
                    // prettier-ignore
                    const mockEvent = {Records:[{cf:{config:{distributionId:"EDFDVBD6EXAMPLE",requestId:"MRVMF7KydIvxMWfJIglgwHQwZsbG2IhRJ07sn9AkKUFSHS9EXAMPLE=="},request:{clientIp:"0.0.0.0",querystring:``,uri:"/some-path/on/the-website",method:"GET",headers:{host:[{key:"Host",value:"d111111abcdef8.cloudfront.net"}],"user-agent":[{key:"User-Agent",value:"curl/7.51.0"}]},origin:{custom:{customHeaders:{"my-origin-custom-header":[{key:"My-Origin-Custom-Header",value:"Test"}]},domainName:"example.com",keepaliveTimeout:5,path:"/custom_path",port:443,protocol:"https",readTimeout:5,sslProtocols:["TLSv1","TLSv1.1"]}}}}}]};

                    lambdaFunction(
                        mockEvent,
                        {},
                        (error, modifiedRequestForOrigin) => {
                            res(
                                modifiedRequestForOrigin.origin.custom
                                    .domainName
                            );
                        }
                    );
                })
        );

        return Promise.all(results).then(results => {
            expect(results.filter(x => x === "blue").length).toBe(500);
        });
    });

    it("Assigns a/b/n backends with reasonably equal weights (rounded for the test)", done => {
        const config = {
            JWT_SECRET_KEY: "abc-123",
            defaultBackend: {
                domainName: "blue.my-site.com"
            },
            origins: [
                {
                    domainName: "blue"
                },
                {
                    domainName: "green"
                },
                {
                    domainName: "red"
                }
            ],
            salt: "unique-assignment-salt",
            SEOTest: true
        };

        const lambdaFunction = edgeProxy(config);

        const results = Array.apply(null, { length: 120000 }).map(
            (_, i) =>
                new Promise(res => {
                    // prettier-ignore
                    const mockEvent = {Records:[{cf:{config:{distributionId:"EDFDVBD6EXAMPLE",requestId:"MRVMF7KydIvxMWfJIglgwHQwZsbG2IhRJ07sn9AkKUFSHS9EXAMPLE=="},request:{clientIp:"0.0.0.0",querystring:``,uri:`/some-path-${i}`,method:"GET",headers:{host:[{key:"Host",value:"d111111abcdef8.cloudfront.net"}],"user-agent":[{key:"User-Agent",value:"curl/7.51.0"}]},origin:{custom:{customHeaders:{"my-origin-custom-header":[{key:"My-Origin-Custom-Header",value:"Test"}]},domainName:"example.com",keepaliveTimeout:5,path:"/custom_path",port:443,protocol:"https",readTimeout:5,sslProtocols:["TLSv1","TLSv1.1"]}}}}}]};

                    lambdaFunction(
                        mockEvent,
                        {},
                        (error, modifiedRequestForOrigin) => {
                            res(
                                modifiedRequestForOrigin.origin.custom
                                    .domainName
                            );
                        }
                    );
                })
        );

        return Promise.all(results).then(results => {
            console.log(results.length);
            expect(
                Math.round(results.filter(x => x === "red").length / 1000, 0)
            ).toBe(40);
            expect(
                Math.round(results.filter(x => x === "green").length / 1000, 0)
            ).toBe(40);
            expect(
                Math.round(results.filter(x => x === "blue").length / 1000, 0)
            ).toBe(40);
            done();
        });
    });
});
