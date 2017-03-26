import chai = require("chai");
import LazyFormatLogger = require("lazy-format-logger");
import {lazyboyjs} from "../src/lazyboyjs";
import InstanceCreateStatus = lazyboyjs.InstanceCreateStatus;
let expect = chai.expect;

declare function emit(k: any, v: any);

describe('LazyBoy', function () {
    let testInstanceId = null;
    let dropDbsAfterTest = true;
    describe('Default error', function () {
        it('Should log a line', function () {
            new lazyboyjs.LazyBoyError("Test logging");
        });
        it('Should NOT log a line', function () {
            lazyboyjs.setLevel(LazyFormatLogger.LogLevel.CRITICAL);
            new lazyboyjs.LazyBoyError("Test logging");
        });
    });
    describe('Default options', function () {
        it('If no options are passed in then default values should be applied', function () {
            lazyboyjs.setLevel(LazyFormatLogger.LogLevel.VERBOSE);
            let l = new lazyboyjs.LazyBoy();
            expect(l.options.host).equal("127.0.0.1");
            expect(l.options.port).equal(5984);
            expect(l.options.prefix).equal("lazy");
            expect(l.options.autoConnect).equal(true);
            expect(Object.keys(l.options.views).length).equal(0);
        });
    });
    describe('AutoConnect false', function () {
        it('Should not connect if autoConnect is set to false', function () {
            let l = new lazyboyjs.LazyBoy({autoConnect: false});
            expect(l.hasConnection()).equal(false);
        });
    });
    describe('AutoConnect true', function () {
        it('Should try connect if no configuration is passed in', function () {
            let l = new lazyboyjs.LazyBoy();
            expect(l.hasConnection()).to.equal(true);
        });
    });
    describe('Create database', function () {
        it("Should create a database with the name 'lazy_test'", function (done) {
            let l = new lazyboyjs.LazyBoy();
            l.InitializeDatabase('test', function (error, status, name) {
                expect(error).to.equal(null);
                expect(name).to.equal('lazy_test');
                expect(status).to.equal(lazyboyjs.DbCreateStatus.Created_Without_Views);
                done();
            });
        });
    });
    describe('Create multiple databases', function () {
        it("Should create databases with the name " +
            "'lazy_test_multiple1','lazy_test_multiple2','lazy_test_multiple3'", function (done) {
            let l = new lazyboyjs.LazyBoy();
            l.Databases('test_multiple1', 'test_multiple2', 'test_multiple3').InitializeAllDatabases(function (error, report) {
                expect(error).to.equal(null);
                expect(report.success.length).to.equal(3);
                done();
            });
        });
    });
    describe('Create database with views', function () {
        it("Should create a database with name 'lazy_views' and add Views", function (done) {
            let fromNameToId = {
                map: function (doc) {
                    if (doc.hasOwnProperty("instance") && doc.instance.hasOwnProperty("name")) {
                        emit(doc.instance.name, doc._id);
                    }
                }
            };
            let fromNameToIdReduce = {
                map: function (doc) {
                    if (doc.hasOwnProperty("instance") && doc.instance.hasOwnProperty("name")) {
                        emit(doc.instance.name, doc._id);
                    }
                },
                reduce: "_count()"
            };
            let LazyDesignViews = {
                version: 1,
                type: "javascript",
                views: {
                    fromNameToId: fromNameToId,
                    fromNameToIdReduce: fromNameToIdReduce
                }
            };

            let LazyOptions = {
                autoConnect: true,
                views: {
                    "lazy_views": LazyDesignViews
                }
            };
            let LazyBoy = new lazyboyjs.LazyBoy(LazyOptions).Databases('views');
            LazyBoy.InitializeAllDatabases(function (error, report) {
                expect(error).to.equal(null);
                expect(report.success[0].name).to.equal("lazy_views");
                expect(report.success[0].status).to.equal(lazyboyjs.DbCreateStatus.Created);
                done();
            });
        });
        it('Should add view to database to existing LazyDesignView', function (done) {
            let myNewView = {
                map: function (doc) {
                    if (doc.hasOwnProperty("instance") && doc.instance.hasOwnProperty("name")) {
                        emit(doc.instance.name, doc._id);
                    }
                },
                reduce: "_count()"
            };
            let LazyBoy = new lazyboyjs.LazyBoy().Databases('views').Connect();
            LazyBoy.AddView('views', 'myNewView', myNewView, function (error, success) {
                expect(error).to.equal(null);
                expect(success).to.equal(true);
                done();
            });
        });
    });
    describe('Create a instance', function () {
        it("Should add an instance in the database named 'lazy_views'", function (done) {
            let l = new lazyboyjs.LazyBoy();
            l.Databases('views').Connect();
            let entry = lazyboyjs.LazyBoy.NewEntry({name: 'TheInstance', otherValue: 'test'});
            l.AddEntry('views', entry, function (error, status, entry) {
                expect(error).to.equal(null);
                expect(status).to.equal(lazyboyjs.InstanceCreateStatus.Created);
                expect(entry._id).to.not.equal(null);
                testInstanceId = entry._id;
                done();
            });
        });
    });
    describe('Get result of view', function () {
        it("Should return the id of an instance in the database 'lazy_views'", function (done) {
            let l = new lazyboyjs.LazyBoy();
            l.Databases('views').Connect();
            l.GetViewResult('views', 'fromNameToId', {key: 'TheInstance'}, function (error, result) {
                expect(error).to.equal(null);
                expect(result.length > 0).to.equal(true);
                expect(result[0].id).to.equal(testInstanceId);
                done();
            });
        });
        it("Should return the id of an instance in the database 'lazy_views' not reduce", function (done) {
            let l = new lazyboyjs.LazyBoy();
            l.Databases('views').Connect();
            l.GetViewResult('views', 'fromNameToIdReduce', {
                key: 'TheInstance',
                reduce: false
            }, function (error, result) {
                expect(error).to.equal(null);
                expect(result.length > 0).to.equal(true);
                expect(result[0].id).to.equal(testInstanceId);
                done();
            });
        });
    });
    describe('Get entry from database', function () {
        it('Should return a complete entry', function (done) {
            let l = new lazyboyjs.LazyBoy();
            l.Databases('views').Connect();
            l.GetEntry('views', testInstanceId, function (error, document) {
                expect(error).to.equal(null);
                expect(document._id).to.equal(testInstanceId);
                expect(document.instance.name).to.equal('TheInstance');
                done();
            });
        });
    });

    if (dropDbsAfterTest) {
        describe('Drop one database', function () {
            it("Should drop the database named 'lazy_test'", function (done) {
                let l = new lazyboyjs.LazyBoy();
                l.Databases('test').Connect().DropDatabase('test', function (error, status) {
                    expect(error).to.equal(null);
                    expect(status).to.equal(lazyboyjs.DbDropStatus.Dropped);
                    done();
                });
            });
        });
        describe('Drop multiple databases', function () {
            it("Should drop all the databases of this test", function (done) {
                let l = new lazyboyjs.LazyBoy();
                l.Databases('views', 'test_multiple1', 'test_multiple2', 'test_multiple3').Connect();
                l.DropDatabases(function (error, report) {
                    expect(error).to.equal(null);
                    expect(report.dropped.length).to.equal(4);
                    done();
                });
            });
        });
    }
});