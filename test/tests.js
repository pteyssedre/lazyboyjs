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
    describe('Create database with views', function () {
        it("Should create a database with name 'lazy_dbviews' and add Views", function (done) {
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
                    "lazy_dbviews": LazyDesignViews
                }
            };
            var LazyBoy = new lazyboyjs.LazyBoy(LazyOptions).Databases(['dbviews']);
            LazyBoy.InitializeAllDatabases(function (error, report) {
                console.log(report);
                expect(error).to.equal(null);
                expect(report.success[0].name).to.equal("lazy_dbviews");
                expect(report.success[0].status).to.equal(lazyboyjs.DbCreateStatus.Created);
                done();
            });
        });
    });
});