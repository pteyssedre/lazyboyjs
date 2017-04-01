"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const LazyFormatLogger = require("lazy-format-logger");
const lazyboyjs_1 = require("../src/lazyboyjs");
var InstanceCreateStatus = lazyboyjs_1.lazyboyjs.InstanceCreateStatus;
const fs = require("fs");
const path = require("path");
const mime = require("mime");
let expect = chai.expect;
describe('LazyBoyAsync', () => {
    let testInstanceId = "";
    let dropDbsAfterTest = true;
    describe('Default error', () => {
        it('Should log a line', () => {
            new lazyboyjs_1.lazyboyjs.LazyBoyError("Test logging");
        });
        it('Should NOT log a line', () => {
            lazyboyjs_1.lazyboyjs.setLevel(LazyFormatLogger.LogLevel.CRITICAL);
            new lazyboyjs_1.lazyboyjs.LazyBoyError("Test logging");
        });
    });
    describe('Default options', () => {
        it('If no options are passed in then default values should be applied', () => {
            lazyboyjs_1.lazyboyjs.setLevel(LazyFormatLogger.LogLevel.VERBOSE);
            let l = new lazyboyjs_1.lazyboyjs.LazyBoyAsync();
            expect(l.options.host).equal("127.0.0.1");
            expect(l.options.port).equal(5984);
            expect(l.options.prefix).equal("lazy");
            expect(l.options.autoConnect).equal(true);
            expect(Object.keys(l.options.views).length).equal(0);
        });
    });
    describe('AutoConnect false', () => {
        it('Should not connect if autoConnect is set to false', () => {
            let l = new lazyboyjs_1.lazyboyjs.LazyBoyAsync({ autoConnect: false });
            expect(l.hasConnection()).equal(false);
        });
    });
    describe('AutoConnect true', () => {
        it('Should try connect if no configuration is passed in', () => {
            let l = new lazyboyjs_1.lazyboyjs.LazyBoyAsync();
            expect(l.hasConnection()).to.equal(true);
        });
    });
    describe('Create database', () => {
        it("Should create a database with the name 'lazy_test'", () => __awaiter(this, void 0, void 0, function* () {
            let l = new lazyboyjs_1.lazyboyjs.LazyBoyAsync();
            let report = yield l.InitializeDatabaseAsync('test');
            expect(report.name).to.equal('lazy_test');
            expect(report.status).to.equal(lazyboyjs_1.lazyboyjs.DbCreateStatus.Created_Without_Views);
        }));
    });
    describe('Create multiple databases', () => {
        it("Should create databases with the name " +
            "'lazy_test_multiple1','lazy_test_multiple2','lazy_test_multiple3'", () => __awaiter(this, void 0, void 0, function* () {
            let l = new lazyboyjs_1.lazyboyjs.LazyBoyAsync().Databases('test_multiple1', 'test_multiple2', 'test_multiple3');
            let report = yield l.InitializeAllDatabasesAsync();
            expect(report.success.length).to.equal(3);
        }));
    });
    describe('Create database with views', () => {
        it("Should create a database with name 'lazy_views' and add Views", () => __awaiter(this, void 0, void 0, function* () {
            let LazyOptions = {
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
            let LazyBoy = new lazyboyjs_1.lazyboyjs.LazyBoyAsync(LazyOptions).Databases('views');
            let report = yield LazyBoy.InitializeAllDatabasesAsync();
            expect(report.success[0].name).to.equal("lazy_views");
            expect(report.success[0].status).to.equal(lazyboyjs_1.lazyboyjs.DbCreateStatus.Created);
        }));
        it('Should add view to database to existing LazyDesignView', () => __awaiter(this, void 0, void 0, function* () {
            let myNewView = {
                map: function (doc) {
                    if (doc.hasOwnProperty("instance") && doc.instance.hasOwnProperty("name")) {
                        emit(doc.instance.name, doc._id);
                    }
                },
                reduce: "_count()"
            };
            let LazyBoy = new lazyboyjs_1.lazyboyjs.LazyBoyAsync().Databases('views');
            yield LazyBoy.ConnectAsync();
            let report = yield LazyBoy.AddViewAsync('views', 'myNewView', myNewView);
            expect(report.error).to.equal(null);
            expect(report.result).to.equal(true);
        }));
    });
    describe('Create a instance', () => {
        it("Should add an instance in the database named 'lazy_views'", () => __awaiter(this, void 0, void 0, function* () {
            let l = new lazyboyjs_1.lazyboyjs.LazyBoyAsync().Databases('views');
            yield l.ConnectAsync();
            let report = yield l.AddEntryAsync('views', { data: { name: 'TheInstance', otherValue: 'test' } });
            expect(report.error).to.equal(null);
            expect(report.result).to.equal(lazyboyjs_1.lazyboyjs.InstanceCreateStatus.Created);
            expect(report.entry._id).to.not.equal(null);
            testInstanceId = report.entry._id;
        }));
    });
    describe('Create views', () => {
        it('Should create a view in db', () => __awaiter(this, void 0, void 0, function* () {
            let l = new lazyboyjs_1.lazyboyjs.LazyBoyAsync().Databases('views');
            yield l.ConnectAsync();
            let report = yield l.AddViewAsync("views", "byTitle", {
                map: "function(doc){ if(doc.instance['Title']){ emit(doc.instance.Title, doc.instance);} }",
                reduce: "_count"
            });
            expect(report.result).to.equal(true);
            report = yield l.AddViewAsync("views", "byTitle2", {
                map: "function(doc){ if(doc.instance['Title']){ emit(doc.instance.Title, doc.instance);} }",
                reduce: "_count"
            });
            expect(report.result).to.equal(true);
            report = yield l.AddViewAsync("views", "byTitle3", {
                map: "function(doc){ if(doc.instance['Title']){ emit(doc.instance.Title, doc.instance);} }",
                reduce: "_count"
            });
            expect(report.result).to.equal(true);
        }));
    });
    describe('Get result of view', () => {
        it("Should return the id of an instance in the database 'lazy_views'", () => __awaiter(this, void 0, void 0, function* () {
            let l = new lazyboyjs_1.lazyboyjs.LazyBoyAsync().Databases('views');
            yield l.ConnectAsync();
            let report = yield l.GetViewResultAsync('views', 'fromNameToId', { key: 'TheInstance', reduce: false });
            expect(report.error).to.equal(null);
            expect(report.result.length > 0).to.equal(true);
            expect(report.result[0].id).to.equal(testInstanceId);
        }));
        it("Should return the id of an instance in the database 'lazy_views' not reduce", () => __awaiter(this, void 0, void 0, function* () {
            let l = new lazyboyjs_1.lazyboyjs.LazyBoyAsync().Databases('views');
            yield l.ConnectAsync();
            let report = yield l.GetViewResultAsync('views', 'fromNameToIdReduce', {
                key: 'TheInstance',
                reduce: false
            });
            expect(report.error).to.equal(null);
            expect(report.result.length > 0).to.equal(true);
            expect(report.result[0].id).to.equal(testInstanceId);
        }));
    });
    describe('Get entry from database', () => {
        it('Should return a complete entry', () => __awaiter(this, void 0, void 0, function* () {
            let l = new lazyboyjs_1.lazyboyjs.LazyBoyAsync().Databases('views');
            yield l.ConnectAsync();
            let report = yield l.GetEntryAsync('views', testInstanceId);
            expect(report.error).to.equal(null);
            expect(report.data._id).to.equal(testInstanceId);
            expect(report.data.instance.name).to.equal('TheInstance');
        }));
    });
    describe('Push multiple views at once', () => {
        it('Should create multiple views at once', () => __awaiter(this, void 0, void 0, function* () {
            let l = new lazyboyjs_1.lazyboyjs.LazyBoyAsync().Databases('test_views');
            yield l.InitializeAllDatabasesAsync();
            yield l.ConnectAsync();
            let result = yield l.AddViewsAsync('test_views', [
                {
                    name: "byTitle",
                    view: { map: "function(doc){ if(doc.instance.Title){ emit(doc.instance.Title, 1); } }" }
                },
                {
                    name: "byTitle2",
                    view: { map: "function(doc){ if(doc.instance.Title){ emit(doc.instance.Title, 1); } }" }
                },
                {
                    name: "byTitle3",
                    view: { map: "function(doc){ if(doc.instance.Title){ emit(doc.instance.Title, 1); } }" }
                }
            ]);
            expect(result.error).to.equal(null);
            expect(result.result).to.equal(true);
        }));
    });
    describe('Attachments', () => {
        let dbName = 'attachment_test';
        let insert;
        it('Should push an attachment', () => __awaiter(this, void 0, void 0, function* () {
            let l = new lazyboyjs_1.lazyboyjs.LazyBoyAsync().Databases(dbName);
            yield l.InitializeAllDatabasesAsync();
            yield l.ConnectAsync();
            insert = yield l.AddEntryAsync(dbName, { data: { name: "document" }, type: "document" });
            expect(insert.error).to.equal(null);
            expect(insert.result).to.equal(InstanceCreateStatus.Created);
            let doc = yield l.AddFileAsAttachmentAsync(dbName, insert.entry._id, insert.entry._rev, "vortex", "./test/vortex.jpg");
            expect(doc.error).to.equal(null);
            expect(doc.status.ok).to.equal(true);
        }));
        it('Should retrieve attachment info', () => __awaiter(this, void 0, void 0, function* () {
            let l = new lazyboyjs_1.lazyboyjs.LazyBoyAsync().Databases(dbName);
            yield l.InitializeAllDatabasesAsync();
            yield l.ConnectAsync();
            let info = yield l.GetAttachmentInfoAsync(dbName, insert.entry._id, 'vortex');
            expect(info).to.not.equal(null);
            expect(info.content_type).equal(mime.lookup('./test/vortex.jpg'));
            let stats = fs.statSync('./test/vortex.jpg');
            expect(info.length).to.equal(stats.size);
        }));
        function WriteFileAsync(read, write) {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => {
                    try {
                        write.on('error', () => {
                            return reject("error write");
                        });
                        write.on('end', () => {
                            return resolve(true);
                        });
                        read.on('error', () => {
                            return reject("error read");
                        });
                        read.on('end', () => {
                            return resolve(true);
                        });
                        read.pipe(write);
                    }
                    catch (exception) {
                        return reject(exception);
                    }
                });
            });
        }
        it('Should retrieve an attachment by stream', () => __awaiter(this, void 0, void 0, function* () {
            let l = new lazyboyjs_1.lazyboyjs.LazyBoyAsync().Databases(dbName);
            yield l.InitializeAllDatabasesAsync();
            yield l.ConnectAsync();
            let downloadPath = path.join(__dirname, './vortex_copy.jpg');
            let sourcePath = path.join(__dirname, './vortex.jpg');
            let writeStream = fs.createWriteStream(downloadPath);
            let readStream = yield l.GetAttachmentStreamAsync(dbName, insert.entry._id, "vortex");
            yield WriteFileAsync(readStream, writeStream);
            let b1 = fs.readFileSync(downloadPath);
            let b2 = fs.readFileSync(sourcePath);
            expect(b1.toString() === b2.toString()).to.equals(true);
        }));
        it('Should retrieve an attachment buffered', () => __awaiter(this, void 0, void 0, function* () {
            let l = new lazyboyjs_1.lazyboyjs.LazyBoyAsync().Databases(dbName);
            yield l.InitializeAllDatabasesAsync();
            yield l.ConnectAsync();
            let downloadPath = path.join(__dirname, './vortex_copy_2.jpg');
            let sourcePath = path.join(__dirname, './vortex.jpg');
            // let writeStream = fs.createWriteStream(downloadPath);
            let data = yield l.GetAttachmentAsync(dbName, insert.entry._id, "vortex");
            let buff = new Buffer(data.body.buffer, 'utf-8');
            fs.write(fs.openSync(downloadPath, 'w'), buff, 0, buff.length, 0, (error, written) => {
                let b1 = fs.readFileSync(downloadPath);
                let b2 = fs.readFileSync(sourcePath);
                expect(b1.toString() === b2.toString()).to.equals(true);
            });
        }));
    });
    describe("Delete Data", () => {
        it("Should flag data as deleted", () => __awaiter(this, void 0, void 0, function* () {
            let l = new lazyboyjs_1.lazyboyjs.LazyBoyAsync().Databases('delete_test');
            yield l.InitializeAllDatabasesAsync();
            yield l.ConnectAsync();
            let insert = yield l.AddEntryAsync('delete_test', { data: { name: "toto" }, type: "user" });
            expect(insert.error).to.equal(null);
            expect(insert.result).to.equal(InstanceCreateStatus.Created);
            let del = yield l.DeleteEntryAsync('delete_test', insert.entry);
            expect(del.error).to.equal(null);
            expect(del.deleted).to.equal(true);
            let zombie = yield l.GetEntryAsync('delete_test', insert.entry._id);
            expect(zombie.error).to.equal(null);
            expect(zombie.data._id).to.equal(insert.entry._id);
            expect(zombie.data.isDeleted).to.equal(true);
        }));
        it("Should delete data permanently", () => __awaiter(this, void 0, void 0, function* () {
            let l = new lazyboyjs_1.lazyboyjs.LazyBoyAsync().Databases('delete_test');
            yield l.InitializeAllDatabasesAsync();
            yield l.ConnectAsync();
            let insert = yield l.AddEntryAsync('delete_test', { data: { name: "toto" }, type: "user" });
            expect(insert.error).to.equal(null);
            expect(insert.result).to.equal(InstanceCreateStatus.Created);
            let del = yield l.DeleteEntryAsync('delete_test', insert.entry, true);
            expect(del.error).to.equal(null);
            expect(del.deleted).to.equal(true);
            let zombie = yield l.GetEntryAsync('delete_test', insert.entry._id);
            expect(zombie.error).to.not.equal(null);
            expect(zombie.error.name).to.equal("CouchError");
            expect(zombie.error.reason).to.equal("deleted");
            expect(zombie.error.error).to.equal("not_found");
            expect(zombie.data).to.equal(null);
        }));
    });
    if (dropDbsAfterTest) {
        describe('Drop one database', () => {
            it("Should drop the database named 'lazy_test'", () => __awaiter(this, void 0, void 0, function* () {
                let l = new lazyboyjs_1.lazyboyjs.LazyBoyAsync().Databases('test');
                yield l.ConnectAsync();
                let report = yield l.DropDatabaseAsync('test');
                expect(report.error).to.equal(null);
                expect(report.status).to.equal(lazyboyjs_1.lazyboyjs.DbDropStatus.Dropped);
            }));
        });
        describe('Drop multiple databases', () => {
            it("Should drop all the databases of this test", () => __awaiter(this, void 0, void 0, function* () {
                let l = new lazyboyjs_1.lazyboyjs.LazyBoyAsync().Databases('views', 'test_multiple1', 'test_multiple2', 'test_multiple3', 'test_views', 'delete_test', 'attachment_test');
                yield l.ConnectAsync();
                let report = yield l.DropAllDatabasesAsync();
                expect(report.success.length).to.equal(7);
                expect(report.fail.length).to.equal(0);
            }));
        });
    }
});
