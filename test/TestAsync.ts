import chai = require("chai");
import LazyFormatLogger = require("lazy-format-logger");
import {lazyboyjs} from "../src/lazyboyjs";
import InstanceCreateStatus = lazyboyjs.InstanceCreateStatus;
import fs = require('fs');
import path = require('path');
import mime = require("mime");
import {read} from "fs";
import ReadableStream = NodeJS.ReadableStream;
import WritableStream = NodeJS.WritableStream;
let expect = chai.expect;

declare function emit(k: any, v: any);

describe('LazyBoyAsync', () => {
    let testInstanceId = "";
    let dropDbsAfterTest = true;
    describe('Default error', () => {
        it('Should log a line', () => {
            new lazyboyjs.LazyBoyError("Test logging");
        });
        it('Should NOT log a line', () => {
            lazyboyjs.setLevel(LazyFormatLogger.LogLevel.CRITICAL);
            new lazyboyjs.LazyBoyError("Test logging");
        });
    });
    describe('Default options', () => {
        it('If no options are passed in then default values should be applied', () => {
            lazyboyjs.setLevel(LazyFormatLogger.LogLevel.VERBOSE);
            let l = new lazyboyjs.LazyBoyAsync();
            expect(l.options.host).equal("127.0.0.1");
            expect(l.options.port).equal(5984);
            expect(l.options.prefix).equal("lazy");
            expect(l.options.autoConnect).equal(true);
            expect(Object.keys(l.options.views).length).equal(0);
        });
    });
    describe('AutoConnect false', () => {
        it('Should not connect if autoConnect is set to false', () => {
            let l = new lazyboyjs.LazyBoyAsync({autoConnect: false, cache: true, raw: false, forceSave: true});
            expect(l.hasConnection()).equal(false);
        });
    });
    describe('AutoConnect true', () => {
        it('Should try connect if no configuration is passed in', () => {
            let l = new lazyboyjs.LazyBoyAsync();
            expect(l.hasConnection()).to.equal(true);
        });
    });
    describe('Create database', () => {
        it("Should create a database with the name 'lazy_test'", async() => {
            let l = new lazyboyjs.LazyBoyAsync();
            let report = await l.InitializeDatabaseAsync('test');
            expect(report.name).to.equal('lazy_test');
            expect(report.status).to.equal(lazyboyjs.DbCreateStatus.Created_Without_Views);
        });
    });
    describe('Create multiple databases', () => {
        it("Should create databases with the name " +
            "'lazy_test_multiple1','lazy_test_multiple2','lazy_test_multiple3'", async() => {
            let l = new lazyboyjs.LazyBoyAsync().Databases('test_multiple1', 'test_multiple2', 'test_multiple3');
            let report = await l.InitializeAllDatabasesAsync();
            expect(report.success.length).to.equal(3);
        });
    });
    describe('Create database with views', () => {
        it("Should create a database with name 'lazy_views' and add Views", async() => {

            let LazyOptions: lazyboyjs.LazyOptions = {
                autoConnect: true,
                cache: true,
                forceSave: true,
                raw: false,
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
            let LazyBoy = new lazyboyjs.LazyBoyAsync(LazyOptions).Databases('views');
            let report = await LazyBoy.InitializeAllDatabasesAsync();
            expect(report.success[0].name).to.equal("lazy_views");
            expect(report.success[0].status).to.equal(lazyboyjs.DbCreateStatus.Created);
        });
        it('Should add view to database to existing LazyDesignView', async() => {

            let myNewView: lazyboyjs.LazyView = {
                map: function (doc) {
                    if (doc.hasOwnProperty("instance") && doc.instance.hasOwnProperty("name")) {
                        emit(doc.instance.name, doc._id);
                    }
                },
                reduce: "_count()"
            };
            let LazyBoy = new lazyboyjs.LazyBoyAsync().Databases('views');
            await LazyBoy.ConnectAsync();
            let report = await LazyBoy.AddViewAsync('views', 'myNewView', myNewView);
            expect(report.error).to.equal(null);
            expect(report.result).to.equal(true);
        });
    });
    describe('Create a instance', () => {
        it("Should add an instance in the database named 'lazy_views'", async() => {
            let l = new lazyboyjs.LazyBoyAsync().Databases('views');
            await l.ConnectAsync();
            let report = await l.AddEntryAsync('views', {data: {name: 'TheInstance', otherValue: 'test'}});
            expect(report.error).to.equal(null);
            expect(report.result).to.equal(lazyboyjs.InstanceCreateStatus.Created);
            expect(report.entry._id).to.not.equal(null);
            testInstanceId = report.entry._id;
        });
    });
    describe('Create views', () => {
        it('Should create a view in db', async() => {
            let l = new lazyboyjs.LazyBoyAsync().Databases('views');
            await l.ConnectAsync();
            let report = await l.AddViewAsync("views", "byTitle",
                {
                    map: "function(doc){ if(doc.instance['Title']){ emit(doc.instance.Title, doc.instance);} }",
                    reduce: "_count"
                });
            expect(report.result).to.equal(true);
            report = await l.AddViewAsync("views", "byTitle2",
                {
                    map: "function(doc){ if(doc.instance['Title']){ emit(doc.instance.Title, doc.instance);} }",
                    reduce: "_count"
                });
            expect(report.result).to.equal(true);
            report = await l.AddViewAsync("views", "byTitle3",
                {
                    map: "function(doc){ if(doc.instance['Title']){ emit(doc.instance.Title, doc.instance);} }",
                    reduce: "_count"
                });
            expect(report.result).to.equal(true);

        });
    });
    describe('Get result of view', () => {
        it("Should return the id of an instance in the database 'lazy_views'", async() => {
            let l = new lazyboyjs.LazyBoyAsync().Databases('views');
            await l.ConnectAsync();
            let report = await l.GetViewResultAsync('views', 'fromNameToId', {key: 'TheInstance', reduce: false});
            expect(report.error).to.equal(null);
            expect(report.result.length > 0).to.equal(true);
            expect(report.result[0].id).to.equal(testInstanceId);
        });
        it("Should return the id of an instance in the database 'lazy_views' not reduce", async() => {
            let l = new lazyboyjs.LazyBoyAsync().Databases('views');
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
    describe('Get entry from database', () => {
        it('Should return a complete entry', async() => {
            let l = new lazyboyjs.LazyBoyAsync().Databases('views');
            await l.ConnectAsync();
            let report = await l.GetEntryAsync('views', testInstanceId);

            expect(report.error).to.equal(null);
            expect(report.data._id).to.equal(testInstanceId);
            expect(report.data.instance.name).to.equal('TheInstance');
        });
    });
    describe('Push multiple views at once', () => {
        it('Should create multiple views at once', async() => {
            let l = new lazyboyjs.LazyBoyAsync().Databases('test_views');
            await l.InitializeAllDatabasesAsync();
            await l.ConnectAsync();

            let result = await l.AddViewsAsync('test_views', [
                {
                    name: "byTitle",
                    view: {map: "function(doc){ if(doc.instance.Title){ emit(doc.instance.Title, 1); } }"}
                },
                {
                    name: "byTitle2",
                    view: {map: "function(doc){ if(doc.instance.Title){ emit(doc.instance.Title, 1); } }"}
                },
                {
                    name: "byTitle3",
                    view: {map: "function(doc){ if(doc.instance.Title){ emit(doc.instance.Title, 1); } }"}
                }
            ]);

            expect(result.error).to.equal(null);
            expect(result.result).to.equal(true);

        });
    });
    describe('Attachments', () => {

        let dbName = 'attachment_test';
        let insert;
        it('Should push an attachment', async() => {

            let l = new lazyboyjs.LazyBoyAsync().Databases(dbName);
            await l.InitializeAllDatabasesAsync();
            await l.ConnectAsync();

            insert = await l.AddEntryAsync(dbName, {data: {name: "document"}, type: "document"});

            expect(insert.error).to.equal(null);
            expect(insert.result).to.equal(InstanceCreateStatus.Created);

            let doc = await l.AddFileAsAttachmentAsync(dbName, insert.entry._id, insert.entry._rev, "vortex", "./test/vortex.jpg");
            expect(doc.error).to.equal(null);
            expect(doc.status.ok).to.equal(true);
        });
        it('Should retrieve attachment info', async() => {

            let l = new lazyboyjs.LazyBoyAsync().Databases(dbName);
            await l.InitializeAllDatabasesAsync();
            await l.ConnectAsync();

            let info = await l.GetAttachmentInfoAsync(dbName, insert.entry._id, 'vortex');
            expect(info).to.not.equal(null);
            expect(info.content_type).equal(mime.lookup('./test/vortex.jpg'));
            let stats = fs.statSync('./test/vortex.jpg');
            expect(info.length).to.equal(stats.size);
        });

        async function WriteFileAsync(read: ReadableStream, write: WritableStream): Promise<boolean> {
            return new Promise<boolean>((resolve, reject) => {
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
                } catch (exception) {
                    return reject(exception)
                }
            });
        }

        it('Should retrieve an attachment by stream', async() => {

            let l = new lazyboyjs.LazyBoyAsync().Databases(dbName);
            await l.InitializeAllDatabasesAsync();
            await l.ConnectAsync();

            let downloadPath = path.join(__dirname, './vortex_copy.jpg');
            let sourcePath = path.join(__dirname, './vortex.jpg');
            let writeStream = fs.createWriteStream(downloadPath);
            let readStream = await l.GetAttachmentStreamAsync(dbName, insert.entry._id, "vortex");
            await WriteFileAsync(readStream, writeStream);

            let b1 = fs.readFileSync(downloadPath);
            let b2 = fs.readFileSync(sourcePath);

            expect(b1.toString() === b2.toString()).to.equals(true);
        });
        it('Should retrieve an attachment buffered', async() => {

            let l = new lazyboyjs.LazyBoyAsync().Databases(dbName);
            await l.InitializeAllDatabasesAsync();
            await l.ConnectAsync();

            let downloadPath = path.join(__dirname, './vortex_copy_2.jpg');
            let sourcePath = path.join(__dirname, './vortex.jpg');
            // let writeStream = fs.createWriteStream(downloadPath);
            let data = await l.GetAttachmentAsync(dbName, insert.entry._id, "vortex");

            let buff = new Buffer(data.body.buffer, 'utf-8');
            fs.write(fs.openSync(downloadPath, 'w'), buff, 0, buff.length, 0, (error, written) => {

                expect(error).to.equals(null);
                expect(written).to.equals(buff.length);

                let b1 = fs.readFileSync(downloadPath);
                let b2 = fs.readFileSync(sourcePath);

                expect(b1.toString() === b2.toString()).to.equals(true);

            });
        });
        it('Should update the attachment', async() => {

            let l = new lazyboyjs.LazyBoyAsync().Databases(dbName);
            await l.InitializeAllDatabasesAsync();
            await l.ConnectAsync();

            let downloadPath = path.join(__dirname, './vortex_copy_2.jpg');
            let downloadPathAndroid = path.join(__dirname, './android_copy.jpg');
            let sourcePathVortex = path.join(__dirname, './vortex.jpg');
            let sourcePathAndroid = path.join(__dirname, './android.jpg');
            let writeStream = fs.createWriteStream(downloadPathAndroid);

            let data = await l.GetAttachmentStreamAsync(dbName, insert.entry._id, "vortex");
            await WriteFileAsync(data, writeStream);

            let b1 = fs.readFileSync(downloadPath);
            let b2 = fs.readFileSync(sourcePathVortex);

            expect(b1.toString() === b2.toString()).to.equals(true);

            let test = await l.GetEntryAsync(dbName, insert.entry._id);

            let doc = await l.AddFileAsAttachmentAsync(dbName, insert.entry._id, test.data._rev, "vortex", "./test/android.jpg");

            expect(doc.error).to.equal(null);
            expect(doc.status.ok).to.equal(true);

            let writeStreamAndroid = fs.createWriteStream(downloadPathAndroid);
            let readStream = await l.GetAttachmentStreamAsync(dbName, insert.entry._id, "vortex");
            await WriteFileAsync(readStream, writeStreamAndroid);

            let b3 = fs.readFileSync(downloadPathAndroid);
            let b4 = fs.readFileSync(sourcePathAndroid);

            expect(b3.toString() === b4.toString()).to.equals(true);
        });
    });
    describe("Delete Data", () => {
        it("Should flag data as deleted", async() => {

            let l = new lazyboyjs.LazyBoyAsync().Databases('delete_test');
            await l.InitializeAllDatabasesAsync();
            await l.ConnectAsync();

            let insert = await l.AddEntryAsync('delete_test', {data: {name: "toto"}, type: "user"});

            expect(insert.error).to.equal(null);
            expect(insert.result).to.equal(InstanceCreateStatus.Created);

            let del = await l.DeleteEntryAsync('delete_test', insert.entry);

            expect(del.error).to.equal(null);
            expect(del.deleted).to.equal(true);

            let zombie = await l.GetEntryAsync('delete_test', insert.entry._id);

            expect(zombie.error).to.equal(null);
            expect(zombie.data._id).to.equal(insert.entry._id);
            expect(zombie.data.isDeleted).to.equal(true);
        });
        it("Should delete data permanently", async() => {

            let l = new lazyboyjs.LazyBoyAsync().Databases('delete_test');
            await l.InitializeAllDatabasesAsync();
            await l.ConnectAsync();

            let insert = await l.AddEntryAsync('delete_test', {data: {name: "toto"}, type: "user"});

            expect(insert.error).to.equal(null);
            expect(insert.result).to.equal(InstanceCreateStatus.Created);

            let del = await l.DeleteEntryAsync('delete_test', insert.entry, true);

            expect(del.error).to.equal(null);
            expect(del.deleted).to.equal(true);

            let zombie = await l.GetEntryAsync('delete_test', insert.entry._id);

            expect(zombie.error).to.not.equal(null);
            expect(zombie.error.name).to.equal("CouchError");
            expect(zombie.error.reason).to.equal("deleted");
            expect(zombie.error.error).to.equal("not_found");
            expect(zombie.data).to.equal(null);
        });
    });

    if (dropDbsAfterTest) {
        describe('Drop one database', () => {
            it("Should drop the database named 'lazy_test'", async() => {
                let l = new lazyboyjs.LazyBoyAsync().Databases('test');
                await l.ConnectAsync();
                let report = await l.DropDatabaseAsync('test');
                expect(report.error).to.equal(null);
                expect(report.status).to.equal(lazyboyjs.DbDropStatus.Dropped);
            });
        });
        describe('Drop multiple databases', () => {
            it("Should drop all the databases of this test", async() => {
                let l = new lazyboyjs.LazyBoyAsync().Databases('views',
                    'test_multiple1',
                    'test_multiple2',
                    'test_multiple3',
                    'test_views',
                    'delete_test',
                    'attachment_test');
                await l.ConnectAsync();
                let report = await l.DropAllDatabasesAsync();
                expect(report.success.length).to.equal(7);
                expect(report.fail.length).to.equal(0);
            });
        });
    }
});