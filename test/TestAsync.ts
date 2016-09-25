import chai = require("chai");
import LazyFormatLogger = require("lazy-format-logger");
import {lazyboyjs} from "../src/lazyboyjs";
let expect = chai.expect;

describe('LazyBoyAsync', ()=> {
    let testInstanceId = "";
    let dropDbsAfterTest = true;
    describe('Default error', ()=> {
        it('Should log a line', ()=> {
            new lazyboyjs.LazyBoyError("Test logging");
        });
        it('Should NOT log a line', ()=> {
            lazyboyjs.setLevel(LazyFormatLogger.LogLevel.CRITICAL);
            new lazyboyjs.LazyBoyError("Test logging");
        });
    });
    describe('Default options', ()=> {
        it('If no options are passed in then default values should be applied', ()=> {
            lazyboyjs.setLevel(LazyFormatLogger.LogLevel.VERBOSE);
            var l = new lazyboyjs.LazyBoyAsync();
            expect(l.options.host).equal("127.0.0.1");
            expect(l.options.port).equal(5984);
            expect(l.options.prefix).equal("lazy");
            expect(l.options.autoConnect).equal(true);
            expect(Object.keys(l.options.views).length).equal(0);
        });
    });
    describe('AutoConnect false', ()=> {
        it('Should not connect if autoConnect is set to false', ()=> {
            var l = new lazyboyjs.LazyBoyAsync({autoConnect: false});
            expect(l.hasConnection()).equal(false);
        });
    });
    describe('AutoConnect true', ()=> {
        it('Should try connect if no configuration is passed in', ()=> {
            var l = new lazyboyjs.LazyBoyAsync();
            expect(l.hasConnection()).to.equal(true);
        });
    });
    describe('Create database', ()=> {
        it("Should create a database with the name 'lazy_test'", async() => {
            var l = new lazyboyjs.LazyBoyAsync();
            let report = await l.InitializeDatabaseAsync('test');
            expect(report.name).to.equal('lazy_test');
            expect(report.status).to.equal(lazyboyjs.DbCreateStatus.Created_Without_Views);
        });
    });
    describe('Create multiple databases', ()=> {
        it("Should create databases with the name " +
            "'lazy_test_multiple1','lazy_test_multiple2','lazy_test_multiple3'", async()=> {
            var l = new lazyboyjs.LazyBoyAsync().Databases('test_multiple1', 'test_multiple2', 'test_multiple3');
            let report = await l.InitializeAllDatabasesAsync();
            expect(report.success.length).to.equal(3);
        });
    });
    describe('Create database with views', ()=> {
        it("Should create a database with name 'lazy_views' and add Views", async()=> {
            function emit(...and: any[]) {
            }

            let LazyOptions: lazyboyjs.LazyOptions = {
                autoConnect: true,
                views: {
                    "lazy_views": {
                        version: 1,
                        type: "javascript",
                        views: {
                            "fromNameToId": {
                                map: function (doc) {
                                    if (doc.hasOwnProperty("instance") && doc.instance.hasOwnProperty("name")) {
                                        emit(doc.instance.name, doc._id);
                                    }
                                },
                                reduce: "_count()"
                            },
                            "fromNameToIdReduce": {
                                map: function (doc) {
                                    if (doc.hasOwnProperty("instance") && doc.instance.hasOwnProperty("name")) {
                                        emit(doc.instance.name, doc._id);
                                    }
                                },
                                reduce: "_count()"
                            }
                        }
                    }
                }
            };
            var LazyBoy = new lazyboyjs.LazyBoyAsync(LazyOptions).Databases('views');
            let report = await LazyBoy.InitializeAllDatabasesAsync();
            expect(report.success[0].name).to.equal("lazy_views");
            expect(report.success[0].status).to.equal(lazyboyjs.DbCreateStatus.Created);
        });
        it('Should add view to database to existing LazyDesignView', async()=> {
            function emit(...and: any[]) {
            }

            var myNewView: lazyboyjs.LazyView = {
                map: function (doc) {
                    if (doc.hasOwnProperty("instance") && doc.instance.hasOwnProperty("name")) {
                        emit(doc.instance.name, doc._id);
                    }
                },
                reduce: "_count()"
            };
            var LazyBoy = new lazyboyjs.LazyBoyAsync().Databases('views');
            LazyBoy.ConnectAsync();
            let report = await LazyBoy.AddViewAsync('views', 'myNewView', myNewView);
            expect(report.error).to.equal(null);
            expect(report.result).to.equal(true);
        });
    });
    describe('Create a instance', ()=> {
        it("Should add an instance in the database named 'lazy_views'", async()=> {
            var l = new lazyboyjs.LazyBoyAsync().Databases('views');
            await l.ConnectAsync();
            let report = await l.AddEntryAsync('views', {data: {name: 'TheInstance', otherValue: 'test'}});
            expect(report.error).to.equal(null);
            expect(report.result).to.equal(lazyboyjs.InstanceCreateStatus.Created);
            expect(report.entry._id).to.not.equal(null);
            testInstanceId = report.entry._id;
        });
    });
    describe('Get result of view', ()=> {
        it("Should return the id of an instance in the database 'lazy_views'", async()=> {
            var l = new lazyboyjs.LazyBoyAsync().Databases('views');
            await l.ConnectAsync();
            let report = await l.GetViewResultAsync('views', 'fromNameToId', {key: 'TheInstance',reduce:false});
            expect(report.error).to.equal(null);
            expect(report.result.length > 0).to.equal(true);
            expect(report.result[0].id).to.equal(testInstanceId);
        });
        it("Should return the id of an instance in the database 'lazy_views' not reduce", async()=> {
            var l = new lazyboyjs.LazyBoyAsync().Databases('views');
            await l.ConnectAsync();
            let report = await l.GetViewResultAsync('views', 'fromNameToIdReduce', {
                key: 'TheInstance',
                reduce: false
            });
            expect(report.error).to.equal(null);
            expect(report.result.length > 0).to.equal(true);
            expect(report.result[0].id).to.equal(testInstanceId);
        });
    });
    describe('Get entry from database', ()=> {
        it('Should return a complete entry', async() => {
            var l = new lazyboyjs.LazyBoyAsync().Databases('views');
            await l.ConnectAsync();
            let report = await l.GetEntryAsync('views', testInstanceId);

            expect(report.error).to.equal(null);
            expect(report.data._id).to.equal(testInstanceId);
            expect(report.data.instance.name).to.equal('TheInstance');
        });
    });

    if (dropDbsAfterTest) {
        describe('Drop one database', ()=> {
            it("Should drop the database named 'lazy_test'", async()=> {
                var l = new lazyboyjs.LazyBoyAsync().Databases('test');
                await l.ConnectAsync();
                let report = await l.DropDatabaseAsync('test');
                expect(report.error).to.equal(null);
                expect(report.status).to.equal(lazyboyjs.DbDropStatus.Dropped);
            });
        });
        describe('Drop multiple databases', ()=> {
            it("Should drop all the databases of this test", async()=> {
                var l = new lazyboyjs.LazyBoyAsync().Databases('views', 'test_multiple1', 'test_multiple2', 'test_multiple3');
                await l.ConnectAsync();
                let report = await l.DropAllDatabasesAsync();
                expect(report.success.length).to.equal(4);
                expect(report.fail.length).to.equal(0);
            });
        });
    }
});