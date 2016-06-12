var chai = require("chai");
var expect = chai.expect;
var LazyBoyJS = require("../dist/lazyboyjs");

describe('LazyBoy', function () {
    describe('Default options', function () {
        it('If no options are passed in then default values should be applyed', function () {
            var l = new LazyBoyJS.LazyBoy();
            expect(l.options.host).equal("127.0.0.1");
            expect(l.options.port).equal(5984);
            expect(l.options.prefix).equal("lazy");
            expect(l.options.autoConnect).equal(true);
            expect(l.options.views).equal(undefined);
        });
    });
    describe('AutoConnect false', function () {
        it('Should not connect if autoConnect is set to false', function () {
            var l = new LazyBoyJS.LazyBoy({autoConnect: false});
            expect(l._connection == undefined).equal(true);
            expect(l.hasConnection()).equal(false);
        });
    });
    describe('AutoConnect true', function () {
        it('Should try connect if no configuration is passed in', function () {
            var l = new LazyBoyJS.LazyBoy();
            expect(l._connection != undefined).to.equal(true);
            expect(l.hasConnection()).to.equal(true);
        });
    });
    describe('Create database', function () {
        it("Should create a database with the name 'lazy_test'", function (done) {
            var l = new LazyBoyJS.LazyBoy();
            l.InitializeDatabase('test', function (name, status) {
                expect(name).to.equal('lazy_test');
                expect(status).to.equal(LazyBoyJS.DbCreateStatus.Created_Without_Views);
                done();
            });
        });
    });
});