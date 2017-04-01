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
const Cradle = require("cradle");
const LazyFormatLogger = require("lazy-format-logger");
const fs = require("fs");
const mime = require("mime");
var lazyboyjs;
(function (lazyboyjs) {
    let Log = new LazyFormatLogger.Logger();
    function setLevel(level) {
        Log = new LazyFormatLogger.Logger(level);
    }
    lazyboyjs.setLevel = setLevel;
    function newEntry(instance, type) {
        let entry = {
            created: new Date().getTime(),
            type: '',
            modified: new Date().getTime(),
            isDeleted: false,
            instance: {}
        };
        if (type) {
            entry.type = type;
        }
        entry.instance = instance;
        return entry;
    }
    lazyboyjs.newEntry = newEntry;
    /**
     * Enumeration of status for Database creation
     */
    var DbCreateStatus;
    (function (DbCreateStatus) {
        DbCreateStatus[DbCreateStatus["Created"] = 1] = "Created";
        DbCreateStatus[DbCreateStatus["UpToDate"] = 2] = "UpToDate";
        DbCreateStatus[DbCreateStatus["UpdateNeeded"] = 4] = "UpdateNeeded";
        DbCreateStatus[DbCreateStatus["Created_Without_Views"] = 8] = "Created_Without_Views";
        DbCreateStatus[DbCreateStatus["Not_Connected"] = 16] = "Not_Connected";
        DbCreateStatus[DbCreateStatus["Error"] = 32] = "Error";
    })(DbCreateStatus = lazyboyjs.DbCreateStatus || (lazyboyjs.DbCreateStatus = {}));
    /**
     * Enumeration of status for Database drop
     */
    var DbDropStatus;
    (function (DbDropStatus) {
        DbDropStatus[DbDropStatus["Dropped"] = 3] = "Dropped";
        DbDropStatus[DbDropStatus["Conflict"] = 6] = "Conflict";
        DbDropStatus[DbDropStatus["Error"] = 12] = "Error";
    })(DbDropStatus = lazyboyjs.DbDropStatus || (lazyboyjs.DbDropStatus = {}));
    /**
     * Enumeration of status for Entry creation
     */
    var InstanceCreateStatus;
    (function (InstanceCreateStatus) {
        InstanceCreateStatus[InstanceCreateStatus["Created"] = 5] = "Created";
        InstanceCreateStatus[InstanceCreateStatus["Conflict"] = 10] = "Conflict";
        InstanceCreateStatus[InstanceCreateStatus["Updated"] = 20] = "Updated";
        InstanceCreateStatus[InstanceCreateStatus["Error"] = 40] = "Error";
    })(InstanceCreateStatus = lazyboyjs.InstanceCreateStatus || (lazyboyjs.InstanceCreateStatus = {}));
    /**
     * Definition of an custom {@link Error} that can be raised and managed by upper layers.
     * If one of the callback return an {@link Error} different from 'null'
     * the upper layer can check if the name value is equal to "LazyBoyError"
     */
    class LazyBoyError {
        constructor(message) {
            this.name = "LazyBoyError";
            this.message = message;
            Log.e("LazyBoyJs", this.name, message);
        }
    }
    lazyboyjs.LazyBoyError = LazyBoyError;
    class LazyConst {
    }
    LazyConst.DesignViews = "_design/views";
    LazyConst.View_Error_Missing = "missing";
    LazyConst.View_Error_Deleted = "deleted";
    lazyboyjs.LazyConst = LazyConst;
    class LazyBase {
        constructor(options) {
            this._dbNames = [];
            this._dbs = {};
            /**
             * Initialization of parameter and {options} object.
             * It will create default {options} object.
             * By default autoConnect it force to ensure use quickly.
             * @private
             */
            this._initParams = () => {
                if (!this.options) {
                    this.options = { host: "127.0.0.1", port: 5984, prefix: "lazy", autoConnect: true, views: {} };
                }
                if (this.options.autoConnect !== false) {
                    this.options.autoConnect = true;
                }
                if (!this.host) {
                    if (!this.options.host) {
                        this.options.host = "127.0.0.1";
                    }
                    this.host = this.options.host;
                }
                if (!this.port || isNaN(this.port)) {
                    if (!this.options.port || isNaN(this.options.port)) {
                        this.options.port = 5984;
                    }
                    this.port = this.options.port;
                }
                if (!this.options.prefix) {
                    this.options.prefix = "lazy";
                }
                else {
                    let p = this.options.prefix.lastIndexOf("_");
                    let l = this.options.prefix.length;
                    if (p === l - 1) {
                        this.options.prefix = this.options.prefix.substr(0, p);
                    }
                }
                // maybe adding https support ...
                this._options = { cache: true, raw: false, forceSave: true };
            };
            /**
             *
             * @param name {string}
             * @returns {boolean}
             * @private
             */
            this._injectDatabaseName = (name) => {
                try {
                    let n = name;
                    if (this.options.prefix) {
                        n = this.options.prefix + "_" + n;
                    }
                    let t = this._dbNames.push(n);
                    return t > -1;
                }
                catch (exception) {
                    Log.i("LazyBase", "_injectDatabaseName", exception);
                }
                return false;
            };
            /**
             *
             * @returns {string}
             * @private
             */
            this._newGUID = () => {
                let s4 = () => {
                    return Math.floor((1 + Math.random()) * 65536).toString(16).substring(1);
                };
                return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
            };
            /**
             *
             * @param dbName
             * @returns {Object}
             * @private
             */
            this._getDb = (dbName) => {
                if (dbName == null || dbName.length == 0) {
                    return null;
                }
                dbName = this._formatDbName(dbName);
                return this._dbs[dbName];
            };
            /**
             *
             * @param dbName
             * @returns {string}
             * @private
             */
            this._formatDbName = function (dbName) {
                if (dbName.indexOf(this.options.prefix + "_") == -1) {
                    dbName = this.options.prefix + "_" + dbName;
                }
                return dbName;
            };
            /**
             *
             * @param dbName {string}
             * @param db {object}
             * @returns {boolean}
             * @private
             */
            this._putDb = (dbName, db) => {
                if (dbName == null || dbName.length == 0) {
                    return false;
                }
                dbName = this._formatDbName(dbName);
                this._dbs[dbName] = db;
                return true;
            };
            if (options && options.logLevel) {
                Log = new LazyFormatLogger.Logger(options.logLevel);
            }
            this.options = options;
            this._initParams();
        }
    }
    /**
     *
     * @param instance {Object}
     * @param type {string}
     * @returns {LazyInstance}
     */
    LazyBase.NewEntry = (instance, type) => {
        let entry = {
            created: new Date().getTime(),
            type: '',
            modified: new Date().getTime(),
            isDeleted: false,
            instance: {}
        };
        if (type) {
            entry.type = type;
        }
        entry.instance = instance;
        return entry;
    };
    lazyboyjs.LazyBase = LazyBase;
    class LazyBoy extends LazyBase {
        constructor(options) {
            super(options);
            this.hasConnection = () => {
                return !!this._connection;
            };
            this._cOaC = (error, result) => {
                Log.d("LazyBoy", "_cOaC", error, result);
            };
            this._report = {
                success: [],
                fail: []
            };
            /**
             * In order to create or update some views for a DB, a validation must be done using the "version" property
             * of the {@link LazyDesignViews#version}
             * @param db {object} database object.
             * @param callback {@link DbCreationCallback}
             * @private
             */
            this._validateDesignViews = (db, callback) => {
                if (!this.options || !this.options.views) {
                    return callback(null, DbCreateStatus.Created_Without_Views);
                }
                let designView = this.options.views[db.name];
                if (!designView) {
                    return callback(null, DbCreateStatus.Created_Without_Views);
                }
                let evaluateView = (error, result) => {
                    let s = result ? DbCreateStatus.Created : DbCreateStatus.Error;
                    return callback(error, s);
                };
                db.get(LazyConst.DesignViews, (error, document) => {
                    if (error) {
                        if (error.reason) {
                            switch (error.reason) {
                                case LazyConst.View_Error_Missing:
                                case LazyConst.View_Error_Deleted:
                                    Log.d("LazyBoy", "_validateDesignViews", "Missing view");
                                    this._saveViews(db, designView, evaluateView);
                                    break;
                                default:
                                    Log.e("LazyBoy", "_validateDesignViews", error);
                                    return callback(error, DbCreateStatus.Error);
                            }
                        }
                        else {
                            return callback(error, DbCreateStatus.Error);
                        }
                    }
                    else if (document) {
                        if (document.version < designView.version) {
                            this._saveViews(db, designView, evaluateView);
                        }
                        else {
                            return callback(null, DbCreateStatus.UpToDate);
                        }
                    }
                    else {
                        return callback(null, DbCreateStatus.Created_Without_Views);
                    }
                });
            };
            /**
             * Shorter to save and validate the {views} of a specific database.
             * @param db {object}
             * @param views {LazyDesignViews}
             * @param callback {function}
             * @private
             */
            this._saveViews = (db, views, callback) => {
                if (views) {
                    db.save(LazyConst.DesignViews, views, (error, result) => {
                        if (error) {
                            Log.e("LazyBoy", "_saveViews", error);
                            return callback(error, false);
                        }
                        Log.d("LazyBoy", "_saveViews", result);
                        return callback(null, true);
                    });
                }
                else {
                    return callback(null, true);
                }
            };
            /**
             * Callback use when {InitializeAllDatabases} is called. It will
             * continue the creation of all databases contain in {_dbNames}.
             * @param error {Error} error.
             * @param name {string} database name.
             * @param status {@link DbCreateStatus} status of the operation.
             * @private
             */
            this._continueCreate = (error, status, name) => {
                let success = DbCreateStatus.Created | DbCreateStatus.Created_Without_Views | DbCreateStatus.UpToDate;
                let fail = DbCreateStatus.Error | DbCreateStatus.Not_Connected;
                let r = { name: name, status: status };
                if (status & fail || error) {
                    if (error) {
                        Log.c("LazyBoy", "InitializeDatabase", "_continueCreate", error);
                    }
                    this._report.fail.push(r);
                }
                else if (status & success) {
                    this._report.success.push(r);
                }
                if (this._dbNames.length == 0) {
                    let error = this._report.fail.length > 0 ? new LazyBoyError("Some db fails") : null;
                    this._cOaC(error, this._report);
                    this._report.success = [];
                    this._report.fail = [];
                    Log.i("LazyBoy", "InitializeDatabase", "_continueCreate", this._report);
                    return;
                }
                let n = this._dbNames.splice(0, 1);
                this.InitializeDatabase(n[0], this._continueCreate);
            };
            if (this.options) {
                this.options.autoConnect ? this.Connect() : false;
            }
        }
        /**
         * Loading in memory all connections using the dbs names and the Cradle.Connection.
         * @return {LazyBoy}
         */
        Connect() {
            Log.d("LazyBoy", "Connect", "initiating connection using Cradle");
            this._connection = new Cradle.Connection(this.host, this.port, this._options);
            for (let name of this._dbNames) {
                Log.d("LazyBoy", "Connect", "initiating connection to db " + name);
                this._dbs[name] = this._connection.database(name);
            }
            return this;
        }
        /**
         *
         * @param names {Array} of strings representing the db name.
         * @return {LazyBoy}
         */
        Databases(...names) {
            for (let name of names) {
                this._injectDatabaseName(name);
            }
            return this;
        }
        /**
         * Using the database's name push through {@link LazyBoy#Databases} function
         * @param callback {DbCreationCallback}
         */
        InitializeAllDatabases(callback) {
            this._cOaC = callback;
            let n = this._dbNames.splice(0, 1);
            this.InitializeDatabase(n[0], this._continueCreate);
        }
        /**
         * @param name {string}
         * @param callback {DbCreationCallback}
         */
        InitializeDatabase(name, callback) {
            if (!this._connection) {
                return callback(null, DbCreateStatus.Not_Connected, name);
            }
            name = this._formatDbName(name);
            let db = this._getDb(name);
            if (!db) {
                db = this._connection.database(name);
                this._putDb(name, db);
            }
            db.exists((error, exist) => {
                if (error) {
                    Log.e("LazyBoy", "InitializeDatabase", "db.exists", error);
                    return callback(null, DbCreateStatus.Error, name);
                }
                if (exist) {
                    Log.i("LazyBoy", "InitializeDatabase", "db exist " + name + "");
                    this._validateDesignViews(db, (error, status) => {
                        let stat = error ? DbCreateStatus.Error : status;
                        return callback(null, stat, name);
                    });
                }
                else {
                    Log.i("LazyBoy", "InitializeDatabase", "creating " + name + "");
                    db.create((error) => {
                        if (error) {
                            Log.i(error);
                            return callback(null, DbCreateStatus.Error, name);
                        }
                        this._validateDesignViews(db, (error, status) => {
                            let stat = error ? DbCreateStatus.Error : status;
                            return callback(null, stat, name);
                        });
                    });
                }
            });
        }
        /**
         * For an easy manage of instance all object push to a 'lazy db' will be encapsulated inside an {@link LazyInstance}.
         * @param dbName {string}
         * @param entry {lazyboyjs.LazyInstance}
         * @param callback {lazyboyjs.InstanceCreateCallback}
         */
        AddEntry(dbName, entry, callback) {
            let id = this._newGUID();
            if (entry.type) {
                id = entry.type + "_" + id;
            }
            let t = new Date().getTime();
            entry.created = t;
            entry.modified = t;
            let db = this._getDb(dbName);
            if (db) {
                db.save(id, entry, (error, result) => {
                    if (error) {
                        Log.e("LazyBoy", "AddEntry", "db.save", error);
                        return callback(error, InstanceCreateStatus.Error, null);
                    }
                    if (result.ok) {
                        entry._id = result.id;
                        entry._rev = result._rev;
                    }
                    return callback(null, InstanceCreateStatus.Created, entry);
                });
            }
            else {
                return callback(new LazyBoyError("database doesn't exist or not managed"), InstanceCreateStatus.Error, null);
            }
        }
        /**
         * Shorter to retrieve instance inside the database.
         * @param dbName {string} database name where to search.
         * @param entryId {string} CouchDB id of the instance to fetch.
         * @param callback {function(error: Error, instance: LazyInstance)}
         * @throw LazyBoyError
         */
        GetEntry(dbName, entryId, callback) {
            let db = this._getDb(dbName);
            if (db) {
                db.get(entryId, (error, document) => {
                    if (error) {
                        return callback(error, null);
                    }
                    return callback(null, document);
                });
            }
            else {
                return callback(new LazyBoyError("database doesn't exist or not managed"), null);
            }
        }
        /**
         * Shorter to delete an entry from a specific database.
         * @param dbName {string} name of the database where to delete.
         * @param entry {LazyInstance} instance to delete.
         * @param callback {function(error: Error, delete:boolean)}
         * @param trueDelete {boolean} flag to force permanent delete
         */
        DeleteEntry(dbName, entry, callback, trueDelete) {
            if (trueDelete) {
                let db = this._getDb(dbName);
                if (db) {
                    db.remove(entry._id, entry._rev, (error, result) => {
                        if (error) {
                            return callback(error, false);
                        }
                        Log.i("DeleteEntry", result);
                        return callback(null, true);
                    });
                }
                else {
                    return callback(new LazyBoyError("database doesn't exist or not managed"), null);
                }
            }
            else {
                this.GetEntry(dbName, entry._id, (error, document) => {
                    if (error) {
                        return callback(error, false);
                    }
                    else {
                        document.isDeleted = true;
                        this.UpdateEntry(dbName, document, (error, updated) => {
                            return callback(error, updated);
                        });
                    }
                });
            }
        }
        /**
         * Shorter to update an entry in a specific databases.
         * @param dbName {string} name of the database where to update.
         * @param entry {LazyInstance} instance to update.
         * @param callback {function(error: Error, updated: boolean)}
         */
        UpdateEntry(dbName, entry, callback) {
            let db = this._getDb(dbName);
            if (db) {
                db.save(entry._id, entry._rev, entry, (error, result) => {
                    if (error) {
                        return callback(error, false, entry);
                    }
                    entry._rev = result._rev;
                    return callback(null, true, entry);
                });
            }
            else {
                return callback(new LazyBoyError("database doesn't exist or not managed"), false, entry);
            }
        }
        /**
         * Shorter to access the result of a view calculation.
         * @param dbName {string} database name where the request should be executed.
         * @param viewName {string} view name initialize the request.
         * @param params {lazyboyjs.LazyViewParams} actual value to search inside the view.
         * @param callback {}
         */
        GetViewResult(dbName, viewName, params, callback) {
            let db = this._getDb(dbName);
            if (db) {
                db.view("views/" + viewName, params, (error, result) => {
                    if (error) {
                        Log.e("LazyBoy", "GetViewResult", error);
                        throw error;
                    }
                    return callback(null, result);
                });
            }
            else {
                return callback(new LazyBoyError("database doesn't exist or not managed"), null);
            }
        }
        /**
         * Shorter to add a new {@link LazyView} to the {@link LazyDesignViews} associated with the database.
         * If no {@link LazyDesignViews} exist one will be created and push to the database. Otherwise the version
         * of the existing one will be incremented.
         * @param dbName {string}
         * @param viewName {string}
         * @param view {LazyView}
         * @param callback {function(error: Error, result: boolean)}
         */
        AddView(dbName, viewName, view, callback) {
            let db = this._getDb(dbName);
            if (!db) {
                return callback(new LazyBoyError("database doesn't exist or not managed"), false);
            }
            let designView = this.options.views[this._formatDbName(dbName)];
            if (!designView) {
                designView = { version: 1, type: 'javascript', views: {} };
                designView.views[viewName] = view;
            }
            else {
                designView.version++;
                designView.views[viewName] = view;
            }
            this.options.views[this._formatDbName(dbName)] = designView;
            this._validateDesignViews(db, (error, result) => {
                Log.d("LazyBoy", "AddView", error, result);
                callback(null, result == DbCreateStatus.Created || result == DbCreateStatus.UpToDate);
            });
        }
        /**
         * Shorter to destroy all managed databases.
         * @param callback {function(error: Error, report: object}
         */
        DropDatabases(callback) {
            let report = {
                dropped: ["name"],
                fail: ["name"]
            };
            report.dropped = [];
            report.fail = [];
            for (let name in this._dbs) {
                if (this._dbs.hasOwnProperty(name)) {
                    let db = this._dbs[name];
                    db.destroy((error) => {
                        if (error) {
                            Log.e("LazyBoy", "DropDatabases", "db.destroy", error);
                            report.fail.push(db.name);
                            if (report.dropped.length + report.fail.length == Object.keys(this._dbs).length) {
                                return callback(null, report);
                            }
                            //throw error;
                        }
                        else {
                            Log.d("LazyBoy", "DropDatabases", "db.destroy");
                            report.dropped.push(db.name);
                            if (report.dropped.length + report.fail.length == Object.keys(this._dbs).length) {
                                return callback(null, report);
                            }
                        }
                    });
                }
            }
        }
        /**
         * Shorter to destroy a specific managed database.
         * @param dbName {string} name of the database to destroy.
         * @param callback {function(error: Error, report: object)}
         */
        DropDatabase(dbName, callback) {
            let db = this._getDb(dbName);
            let dbArray = this._dbs;
            if (db) {
                db.destroy(function (error) {
                    if (error) {
                        return callback(error, DbDropStatus.Error);
                    }
                    delete dbArray[dbName];
                    return callback(null, DbDropStatus.Dropped);
                });
            }
            else {
                return callback(new LazyBoyError("database doesn't exist or not managed"), null);
            }
        }
    }
    lazyboyjs.LazyBoy = LazyBoy;
    class LazyBoyAsync extends LazyBase {
        constructor(options) {
            super(options);
            this.hasConnection = () => {
                return !!this._connection;
            };
            if (this.options) {
                this.options.autoConnect ? this.ConnectAsync() : false;
            }
        }
        /**
         * Loading in memory all connections using the dbs names and the Cradle.Connection.
         * @return {Promise<boolean>}
         */
        ConnectAsync() {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => {
                    let result = false;
                    try {
                        Log.d("LazyBoyAsync", "ConnectAsync", "initiating connection using Cradle");
                        this._connection = new Cradle.Connection(this.host, this.port, this._options);
                        for (let name of this._dbNames) {
                            Log.d("LazyBoyAsync", "ConnectAsync", "initiating connection to db " + name);
                            this._dbs[name] = this._connection.database(name);
                        }
                        result = true;
                        return resolve(result);
                    }
                    catch (exception) {
                        Log.c("LazyBoyAsync", "ConnectAsync", exception);
                        return reject(exception);
                    }
                });
            });
        }
        /**
         * Shorter to add databases to
         * @param names {Array} of strings representing the db name.
         * @return {LazyBoy}
         */
        Databases(...names) {
            for (let name of names) {
                this._injectDatabaseName(name);
            }
            return this;
        }
        /**
         * Using the database's name push through {@link LazyBoy#Databases} function
         * @return {Promise<ReportInitialization>}
         */
        InitializeAllDatabasesAsync() {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                    let gReport = { success: [], fail: [] };
                    let success = DbCreateStatus.Created | DbCreateStatus.Created_Without_Views | DbCreateStatus.UpToDate;
                    let fail = DbCreateStatus.Error | DbCreateStatus.Not_Connected;
                    try {
                        for (let name of this._dbNames) {
                            let report = yield this.InitializeDatabaseAsync(name);
                            if (report.status & success) {
                                gReport.success.push(report);
                            }
                            else if (report.status & fail) {
                                gReport.fail.push(report);
                            }
                            if ((gReport.success.length + gReport.fail.length) === this._dbNames.length) {
                                return resolve(gReport);
                            }
                        }
                    }
                    catch (exception) {
                        Log.c("LazyBoyAsync", "InitializeAllDatabasesAsync", exception);
                        return reject(exception);
                    }
                }));
            });
        }
        /**
         * @param name {string}
         * @return {Promise<{status: DbCreateStatus, name: string}>}
         */
        InitializeDatabaseAsync(name) {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => {
                    let r = { status: DbCreateStatus.Not_Connected, name: name };
                    try {
                        if (!this._connection) {
                            return resolve(r);
                        }
                        Log.i("LazyBoyAsync", "InitializeDatabaseAsync", "initializing database " + name);
                        let db = this._getAndConnectDb(name);
                        r.name = db.name;
                        db.exists((error, exist) => __awaiter(this, void 0, void 0, function* () {
                            if (error) {
                                Log.e("LazyBoyAsync", "InitializeDatabaseAsync", "db.exists", error);
                                r.status = DbCreateStatus.Error;
                                return resolve(r);
                            }
                            if (exist) {
                                Log.i("LazyBoyAsync", "InitializeDatabaseAsync", "db exist " + name + "");
                                let report = yield this._validateDesignViewsAsync(db);
                                r.status = report.error ? DbCreateStatus.Error : report.status;
                                return resolve(r);
                            }
                            else {
                                Log.i("LazyBoyAsync", "InitializeDatabaseAsync", "creating " + name + "");
                                db.create((error) => __awaiter(this, void 0, void 0, function* () {
                                    if (error) {
                                        Log.i(error);
                                        r.status = DbCreateStatus.Error;
                                        return resolve(r);
                                    }
                                    let report = yield this._validateDesignViewsAsync(db);
                                    r.status = report.error ? DbCreateStatus.Error : report.status;
                                    return resolve(r);
                                }));
                            }
                        }));
                    }
                    catch (exception) {
                        Log.c("LazyBoyAsync", "InitializeDatabaseAsync", exception);
                        return reject(exception);
                    }
                });
            });
        }
        /**
         * For an easy manage of instance all object push to a 'lazy db' will be encapsulated inside an {@link LazyInstance}.
         * @param dbName {string} database name where to insert data.
         * @param data {object}
         * @return {Promise<{error: Error, result: InstanceCreateStatus, entry?: LazyInstance}>}
         */
        AddEntryAsync(dbName, data) {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => {
                    let r = {
                        error: null,
                        result: InstanceCreateStatus.Error
                    };
                    try {
                        let entry = LazyBoyAsync.NewEntry(data.data, data.type);
                        let id = this._newGUID();
                        if (entry.type) {
                            id = entry.type + "_" + id;
                        }
                        let t = new Date().getTime();
                        entry.created = t;
                        entry.modified = t;
                        let db = this._getAndConnectDb(dbName);
                        db.save(id, entry, (error, result) => {
                            if (error) {
                                Log.e("LazyBoyAsync", "AddEntryAsync", "db.save", error);
                                r.error = error;
                                r.result = InstanceCreateStatus.Error;
                                r.entry = null;
                                return resolve(r);
                            }
                            if (result.ok) {
                                entry._id = result.id;
                                entry._rev = result._rev;
                            }
                            r.error = null;
                            r.result = InstanceCreateStatus.Created;
                            r.entry = entry;
                            return resolve(r);
                        });
                    }
                    catch (exception) {
                        Log.c("LazyBoyAsync", "AddEntryAsync", exception);
                        return reject(exception);
                    }
                });
            });
        }
        /**
         * Shorter to retrieve instance inside the database.
         * @param dbName {string} database name where to search.
         * @param entryId {string} CouchDB id of the instance to fetch.
         * @return {Promise<{error: Error, data: LazyInstance}>}
         */
        GetEntryAsync(dbName, entryId) {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => {
                    let r = { error: null, data: null };
                    try {
                        let db = this._getAndConnectDb(dbName);
                        db.get(entryId, (error, document) => {
                            r.error = error;
                            if (error) {
                                r.data = null;
                                return resolve(r);
                            }
                            r.data = document;
                            return resolve(r);
                        });
                    }
                    catch (exception) {
                        Log.c("LazyBoyAsync", "GetEntryAsync", exception);
                        return reject(exception);
                    }
                });
            });
        }
        /**
         * Shorter to delete an entry from a specific database.
         * @param dbName {string} name of the database where to delete.
         * @param entry {LazyInstance} instance to delete.
         * @param trueDelete {boolean} flag to force permanent delete, with default value to false
         * @return {Promise<{error: Error, deleted: boolean}>}
         */
        DeleteEntryAsync(dbName, entry, trueDelete = false) {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                    let r = { error: null, deleted: false };
                    try {
                        if (trueDelete) {
                            let db = this._getAndConnectDb(dbName);
                            db.remove(entry._id, entry._rev, (error, result) => {
                                r.error = error;
                                if (error) {
                                    r.deleted = false;
                                    return resolve(r);
                                }
                                Log.i("DeleteEntry", result);
                                r.deleted = true;
                                return resolve(r);
                            });
                        }
                        else {
                            let gRep = yield this.GetEntryAsync(dbName, entry._id);
                            r.error = gRep.error;
                            if (r.error) {
                                r.deleted = false;
                                return resolve(r);
                            }
                            else {
                                gRep.data.isDeleted = true;
                                let report = yield this.UpdateEntryAsync(dbName, gRep.data);
                                r.error = report.error;
                                r.deleted = report.updated;
                                return resolve(r);
                            }
                        }
                    }
                    catch (exception) {
                        Log.c("LazyBoyAsync", "DeleteEntryAsync", exception);
                        return reject(exception);
                    }
                }));
            });
        }
        /**
         * Shorter to update an entry in a specific databases.
         * @param dbName {string} name of the database where to update.
         * @param entry {LazyInstance} instance to update.
         * @return {Promise<{error: Error, updated: boolean, data: LazyInstance}>}
         */
        UpdateEntryAsync(dbName, entry) {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => {
                    let r = { error: null, updated: false, data: null };
                    try {
                        let db = this._getAndConnectDb(dbName);
                        db.save(entry._id, entry._rev, entry, (error, result) => {
                            if (error) {
                                r.error = error;
                                r.updated = false;
                                r.data = null;
                                return resolve(r);
                            }
                            entry._rev = result._rev;
                            r.error = null;
                            r.updated = true;
                            r.data = entry;
                            return resolve(r);
                        });
                    }
                    catch (exception) {
                        Log.c("LazyBoyAsync", "UpdateEntryAsync", exception);
                        return reject(exception);
                    }
                });
            });
        }
        /**
         * Shorter to access the result of a view calculation.
         * @param dbName {string} database name where the request should be executed.
         * @param viewName {string} view name initialize the request.
         * @param params {lazyboyjs.LazyViewParams} actual value to search inside the view.
         * @return {Promise<{error: Error, result: any}>}
         */
        GetViewResultAsync(dbName, viewName, params) {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => {
                    let r = { error: null, result: null };
                    try {
                        let db = this._getAndConnectDb(dbName);
                        db.view("views/" + viewName, params, (error, result) => {
                            r.error = error;
                            r.result = result;
                            if (error) {
                                Log.e("LazyBoyAsync", "GetViewResultAsync", error);
                            }
                            return resolve(r);
                        });
                    }
                    catch (exception) {
                        Log.c("LazyBoyAsync", "GetViewResultAsync", exception);
                        return reject(exception);
                    }
                });
            });
        }
        /**
         * Shorter to add a new {@link LazyView} to the {@link LazyDesignViews} associated with the database.
         * If no {@link LazyDesignViews} exist one will be created and push to the database. Otherwise the version
         * of the existing one will be incremented.
         * @param dbName {string}
         * @param viewName {string}
         * @param view {LazyView}
         * @return {Promise<{error: Error, result: boolean}>}
         */
        AddViewAsync(dbName, viewName, view) {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                    let r = { error: null, result: false };
                    try {
                        let db = this._getAndConnectDb(dbName);
                        let d = yield this._getDesignViewsAsync(db);
                        let design = d.result;
                        let mem = this.options.views[db.name];
                        if (!mem && !design || mem && !design) {
                            this._updateView(dbName, viewName, view);
                        }
                        else if (!mem && design) {
                            this.options.views[db.name] = design;
                            mem = this.options.views[db.name];
                        }
                        if (mem && design) {
                            mem["_rev"] = design["_rev"];
                            if (!mem.views[viewName]) {
                                this._updateView(dbName, viewName, view);
                            }
                            else if (mem.views[viewName]) {
                                let a = mem.views[viewName].map.toString();
                                let c = view.map.toString();
                                if (a !== c) {
                                    this._updateView(dbName, viewName, view);
                                }
                            }
                        }
                        let report = yield this._validateDesignViewsAsync(db);
                        r.error = report.error;
                        r.result = (report.status == DbCreateStatus.Created || report.status == DbCreateStatus.UpToDate);
                        return resolve(r);
                    }
                    catch (exception) {
                        Log.c("LazyBoyAsync", "AddViewAsync", exception);
                        return reject(exception);
                    }
                }));
            });
        }
        /**
         *
         * @param dbName {string} database name where to push the desing view.
         * @param views {Object}
         * @return {Promise<{error: Error, result: boolean}>}
         * @constructor
         */
        AddViewsAsync(dbName, views) {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                    let r = { error: null, result: false };
                    try {
                        for (let view of views) {
                            this._updateView(dbName, view.name, view.view);
                        }
                        let db = this._getAndConnectDb(dbName);
                        let report = yield this._validateDesignViewsAsync(db);
                        r.error = report.error;
                        r.result = (report.status == DbCreateStatus.Created || report.status == DbCreateStatus.UpToDate);
                        return resolve(r);
                    }
                    catch (exception) {
                        Log.c("LazyBoyAsync", "AddViewsAsync", exception);
                        return reject(exception);
                    }
                }));
            });
        }
        /**
         * Shorter to destroy all managed databases.
         * @return {Promise<{success: string[], fail: string[]}>}
         */
        DropAllDatabasesAsync() {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                    let r = { success: [], fail: [] };
                    try {
                        for (let name of this._dbNames) {
                            let report = yield this.DropDatabaseAsync(name);
                            if (report.error) {
                                r.fail.push(name);
                            }
                            else {
                                r.success.push(name);
                            }
                        }
                        return resolve(r);
                    }
                    catch (exception) {
                        Log.c("LazyBoyAsync", "DropAllDatabasesAsync", exception);
                        return reject(exception);
                    }
                }));
            });
        }
        /**
         * Shorter to destroy a specific managed database.
         * @param dbName {string} name of the database to destroy.
         * @return {Promise<{error: Error, status: DbDropStatus}>}
         */
        DropDatabaseAsync(dbName) {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => {
                    let r = { error: null, status: DbDropStatus.Error };
                    try {
                        let db = this._getAndConnectDb(dbName);
                        db.destroy((error) => {
                            if (error) {
                                r.error = error;
                                r.status = DbDropStatus.Error;
                                return resolve(r);
                            }
                            delete this._dbs[dbName];
                            r.error = null;
                            r.status = DbDropStatus.Dropped;
                            return resolve(r);
                        });
                    }
                    catch (exception) {
                        Log.c("LazyBoyAsync", "DropDatabaseAsync", exception);
                        return reject(exception);
                    }
                });
            });
        }
        AddAttachment(dbName, entryId, rev, data) {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve) => {
                    let r = { error: null, status: 0 };
                    let db = this._getDb(dbName);
                    if (!db) {
                        db = this._getAndConnectDb(dbName);
                    }
                    db.saveAttachment({ id: entryId, rev: rev }, data, (err, reply) => {
                        r.error = err;
                        if (err) {
                            Log.e("LazyBoyAsync", "AddAttachment", "saveAttachment", err);
                        }
                        r.status = reply;
                        resolve(r);
                    });
                });
            });
        }
        AddFileAsAttachmentAsync(dbName, entryId, rev, name, path) {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve) => {
                    let r = { error: null, status: 0 };
                    let db = this._getAndConnectDb(dbName);
                    let attachmentData = {
                        name: name,
                        'Content-Type': mime.lookup(path)
                    };
                    let readStream = fs.createReadStream(path);
                    let writeStream = db.saveAttachment({ id: entryId, rev: rev }, attachmentData, (err, reply) => {
                        r.error = err;
                        if (err) {
                            Log.e("LazyBoyAsync", "AddAttachment", "saveAttachment", err);
                        }
                        r.status = reply;
                        resolve(r);
                    });
                    readStream.pipe(writeStream);
                });
            });
        }
        GetAttachmentStreamAsync(dbName, entryId, attachmentName) {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        Log.d("LazyBoyAsync", "GetAttachmentAsync", entryId, attachmentName);
                        let db = this._getAndConnectDb(dbName);
                        let data = db.getAttachment(entryId, attachmentName, undefined);
                        Log.d("LazyBoyAsync", "GetAttachmentAsync", data);
                        return resolve(data);
                    }
                    catch (exception) {
                        Log.c("LazyBoyAsync", "GetAttachmentAsync", exception);
                        return reject(exception);
                    }
                }));
            });
        }
        GetAttachmentAsync(dbName, entryId, attachmentName) {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        Log.d("LazyBoyAsync", "GetAttachmentAsync", entryId, attachmentName);
                        let db = this._getAndConnectDb(dbName);
                        db.getAttachment(entryId, attachmentName, (error, reply) => {
                            if (error) {
                                Log.c("LazyBoyAsync", "GetAttachmentAsync", "getAttachment", error);
                                return resolve(null);
                            }
                            Log.d("LazyBoyAsync", "GetAttachmentAsync", reply.body.buffer);
                            return resolve(reply);
                        });
                    }
                    catch (exception) {
                        Log.c("LazyBoyAsync", "GetAttachmentAsync", exception);
                        return reject(exception);
                    }
                }));
            });
        }
        GetAttachmentInfoAsync(dbName, entryId, attachmentName) {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        let get = yield this.GetEntryAsync(dbName, entryId);
                        if (!get.data._attachments || !get.data._attachments[attachmentName]) {
                            return resolve(null);
                        }
                        return resolve(get.data._attachments[attachmentName]);
                    }
                    catch (exception) {
                        Log.c("LazyBoyAsync", "GetAttachmentInfoAsync", exception);
                        return reject(exception);
                    }
                }));
            });
        }
        /**
         *
         * @param dbName
         * @param viewName
         * @param view
         * @private
         */
        _updateView(dbName, viewName, view) {
            Log.d("LazyBoyAsync", "_updateView", dbName, viewName);
            let designView = this.options.views[this._formatDbName(dbName)];
            if (!designView) {
                designView = { version: 1, type: 'javascript', views: {} };
                designView.views[viewName] = view;
            }
            else {
                designView.version++;
                designView.views[viewName] = view;
            }
            this.options.views[this._formatDbName(dbName)] = designView;
        }
        /**
         *
         * @param name
         * @return {object}
         * @private
         */
        _getAndConnectDb(name) {
            name = this._formatDbName(name);
            let db = this._getDb(name);
            if (!db) {
                db = this._connection.database(name);
                this._putDb(name, db);
            }
            return db;
        }
        /**
         * In order to create or update some views for a DB, a validation must be done using the "version" property
         * of the {@link LazyDesignViews#version}
         * @param db {object} database object.
         * @return {Promise<{error: Error, status: DbCreateStatus}>}
         * @private
         */
        _validateDesignViewsAsync(db) {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                    let r = { error: null, status: DbCreateStatus.Error };
                    try {
                        if (!this.options || !this.options.views) {
                            r.status = DbCreateStatus.Created_Without_Views;
                            return resolve(r);
                        }
                        let designView = this.options.views[db.name];
                        if (!designView) {
                            r.status = DbCreateStatus.Created_Without_Views;
                            return resolve(r);
                        }
                        db.get(LazyConst.DesignViews, (error, document) => __awaiter(this, void 0, void 0, function* () {
                            if (error) {
                                if (error.reason) {
                                    switch (error.reason) {
                                        case LazyConst.View_Error_Missing:
                                        case LazyConst.View_Error_Deleted:
                                            Log.d("LazyBoyAsync", "_validateDesignViewsAsync", "Missing view");
                                            let report = yield this._saveViewsAsync(db, designView);
                                            r.error = report.error;
                                            r.status = report.result ? DbCreateStatus.Created : DbCreateStatus.Created_Without_Views;
                                            r.status = r.error ? DbCreateStatus.Error : r.status;
                                            return resolve(r);
                                        default:
                                            Log.e("LazyBoyAsync", "_validateDesignViewsAsync", error);
                                            r.error = error;
                                            r.status = DbCreateStatus.Error;
                                            return resolve(r);
                                    }
                                }
                                else {
                                    r.error = error;
                                    r.status = DbCreateStatus.Error;
                                    return resolve(r);
                                }
                            }
                            else if (document) {
                                Log.d("LazyBoyAsync", "_validateDesignViewsAsync", document.version, designView.version);
                                if (document.version < designView.version) {
                                    let report = yield this._saveViewsAsync(db, designView);
                                    r.error = report.error;
                                    r.status = report.result ? DbCreateStatus.Created : DbCreateStatus.Created_Without_Views;
                                    r.status = r.error ? DbCreateStatus.Error : r.status;
                                    return resolve(r);
                                }
                                else {
                                    r.error = null;
                                    r.status = DbCreateStatus.UpToDate;
                                    return resolve(r);
                                }
                            }
                            else {
                                r.error = null;
                                r.status = DbCreateStatus.Created_Without_Views;
                                return resolve(r);
                            }
                        }));
                    }
                    catch (exception) {
                        Log.c("LazyBoyAsync", "_validateDesignViewsAsync", exception);
                        return reject(exception);
                    }
                }));
            });
        }
        _getDesignViewsAsync(db) {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => {
                    let r = { error: null, result: null };
                    try {
                        db.get(LazyConst.DesignViews, (error, document) => {
                            if (error) {
                                Log.e("LazyBoyAsync", "_getDesignViewsAsync", error);
                            }
                            r.result = document;
                            r.error = error;
                            return resolve(r);
                        });
                    }
                    catch (exception) {
                        Log.c("LazyBoyAsync", "_validateDesignViewsAsync", exception);
                        return reject(exception);
                    }
                });
            });
        }
        /**
         * Shorter to save and validate the {views} of a specific database.
         * @param db {object}
         * @param views {LazyDesignViews}
         * @return {Promise<{error: Error, result: boolean}>}
         * @private
         */
        _saveViewsAsync(db, views) {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => {
                    let r = { error: null, result: false };
                    try {
                        if (views) {
                            db.save(LazyConst.DesignViews, views, (error, result) => {
                                if (error) {
                                    Log.e("LazyBoyAsync", "_saveViewsAsync", error);
                                    r.error = error;
                                    r.result = false;
                                    return resolve(r);
                                }
                                views["_rev"] = result._rev;
                                Log.d("LazyBoyAsync", "_saveViewsAsync", result);
                                r.result = true;
                                return resolve(r);
                            });
                        }
                        else {
                            return resolve(r);
                        }
                    }
                    catch (exception) {
                        Log.c("LazyBoyAsync", "_saveViewsAsync", exception);
                        return reject(exception);
                    }
                });
            });
        }
    }
    lazyboyjs.LazyBoyAsync = LazyBoyAsync;
})(lazyboyjs = exports.lazyboyjs || (exports.lazyboyjs = {}));
