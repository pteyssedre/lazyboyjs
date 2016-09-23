import chai = require("chai");
import LazyFormatLogger = require("lazy-format-logger");
import {lazyboyjs} from "../src/lazyboyjs";
let expect = chai.expect;

describe('LazyBoyAsync', ()=> {
    let testInstanceId: string = null;
    let dropDbsAfterTest: boolean = true;
    describe('Default error', ()=> {
        it('Should log a line', ()=> {
            new lazyboyjs.LazyBoyError("Test logging");
        });
        it('Should NOT log a line', ()=> {
            lazyboyjs.setLevel(LazyFormatLogger.LogLevel.INFO);
            new lazyboyjs.LazyBoyError("Test logging");
        });
    });
    describe('Multiple databases', ()=> {
        var l = new lazyboyjs.LazyBoyAsync().Databases('test_multiple1', 'test_multiple2', 'test_multiple3');
        it("Should create databases with the name " +
            "'lazy_test_multiple1','lazy_test_multiple2','lazy_test_multiple3'", async()=> {
            let report = await l.InitializeAllDatabasesAsync();
            expect(report.success.length).to.equal(3);
        });
        if (dropDbsAfterTest) {
            it("Should drop databases with the name " +
                "'lazy_test_multiple1','lazy_test_multiple2','lazy_test_multiple3'", async()=> {
                let report = await l.DropAllDatabasesAsync();
                expect(report.success.length).to.equal(3);
            });
        }
    });
});