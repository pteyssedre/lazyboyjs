var chai = require("chai");
var expect = chai.expect;
var lazyboyjs = require("../dist/lazyboyjs").lazyboyjs;

describe('LazyBoy', function () {
    describe('Default options', function () {
        it('If no options are passed in then default values should be applied', function () {
            var l = new lazyboyjs.LazyBoy();
            expect(l.options.host).equal("127.0.0.1");
            expect(l.options.port).equal(5984);
            expect(l.options.prefix).equal("lazy");
            expect(l.options.autoConnect).equal(true);
            expect(l.options.views).equal(undefined);
        });
    });
    describe('AutoConnect false', function () {
        it('Should not connect if autoConnect is set to false', function () {
            var l = new lazyboyjs.LazyBoy({autoConnect: false});
            expect(l._connection == undefined).equal(true);
            expect(l.hasConnection()).equal(false);
        });
    });
    describe('AutoConnect true', function () {
        it('Should try connect if no configuration is passed in', function () {
            var l = new lazyboyjs.LazyBoy();
            expect(l._connection != undefined).to.equal(true);
            expect(l.hasConnection()).to.equal(true);
        });
    });
    describe('Create database', function () {
        it("Should create a database with the name 'lazy_test'", function (done) {
            var l = new lazyboyjs.LazyBoy();
            l.InitializeDatabase('test', function (name, status) {
                expect(name).to.equal('lazy_test');
                expect(status).to.equal(lazyboyjs.DbCreateStatus.Created_Without_Views);
                done();
            });
        });
    });
    describe('Create multiple databases', function () {
        it("Should create databases with the name " +
            "'lazy_test_multiple1','lazy_test_multiple2','lazy_test_multiple3'", function (done) {
            var l = new lazyboyjs.LazyBoy();
            l.Databases('test_multiple1', 'test_multiple2', 'test_multiple3').InitializeAllDatabases(function (error, report) {
                expect(error).to.equal(null);
                expect(report.success.length).to.equal(3);
                done();
            });
        });
    });
    describe('Create database with views', function () {
        it("Should create a database with name 'lazy_views' and add Views", function (done) {
            var fromNameToId = {
                map: function (doc) {
                    if (doc.hasOwnProperty("instance") && doc.instance.hasOwnProperty("name")) {
                        emit(doc.name, doc._id);
                    }
                }
            };
            var LazyDesignViews = {
                version: 1,
                type: "javascript",
                views: {
                    fromNameToId: fromNameToId
                }
            };

            var LazyOptions = {
                autoConnect: true,
                views: {
                    "lazy_views": LazyDesignViews
                }
            };
            var LazyBoy = new lazyboyjs.LazyBoy(LazyOptions).Databases('views');
            LazyBoy.InitializeAllDatabases(function (error, report) {
                console.log(report);
                expect(error).to.equal(null);
                expect(report.success[0].name).to.equal("lazy_views");
                expect(report.success[0].status).to.equal(lazyboyjs.DbCreateStatus.Created);
                done();
            });
        });
    });
    describe('Drop one database', function () {
        it("Should drop the database named 'lazy_test'", function (done) {
            var l = new lazyboyjs.LazyBoy();
            l.Databases('test').Connect().DropDatabase('test', function (error, status) {
                expect(error).to.equal(null);
                expect(status).to.equal(lazyboyjs.DbDropStatus.Dropped);
                done();
            });
        });
    });
    describe('Drop multiple databases', function () {
        it("Should drop all the databases of this test", function (done) {
            var l = new lazyboyjs.LazyBoy();
            l.Databases('views', 'test_multiple1', 'test_multiple2', 'test_multiple3').Connect();
            l.DropDatabases(function (error, report) {
                expect(error).to.equal(null);
                expect(report.dropped.length).to.equal(4);
                done();
            });
        });
    });
});