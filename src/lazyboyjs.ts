import * as Cradle from "cradle";
import LazyFormatLogger = require("lazy-format-logger");
import fs = require("fs");
import mime = require('mime');

export module lazyboyjs {

    import WritableStream = NodeJS.WritableStream;
    import ReadableStream = NodeJS.ReadableStream;
    let Log: LazyFormatLogger.Logger = new LazyFormatLogger.Logger();

    export function setLevel(level: LazyFormatLogger.LogLevel): void {
        Log = new LazyFormatLogger.Logger(level);
    }

    export function newEntry(instance: any, type?: string): LazyInstance {
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

    /**
     * Definition of {@link LazyInstance} object.
     * Those are the minimal required fields for an instance to be valid.
     */
    export interface LazyInstance {
        _id?: string;
        _rev?: string;
        created: number;
        modified: number;
        isDeleted: boolean;
        type: string;
        instance: any;
        _attachments?: {[id: string]: CouchAttachment}
    }

    export interface CouchAttachment {
        content_type: string;
        revpos: number;
        digest: string;
        length: number;
        stub: boolean;
    }

    /**
     * Definition of {@link LazyView} object.
     * Those are the minimal required fields for an instance to be valid.
     */
    export interface LazyView {
        map: any;
        reduce?: any;
    }

    /**
     * Definition of {@link LazyDesignViews} object.
     * Those are the minimal required fields for an instance to be valid.
     */
    export interface LazyDesignViews {
        version: number;
        type: string;
        views: {[id: string]: LazyView};
    }

    /**
     * Definition of {@link LazyOptions} object.
     * Those are the minimal required fields for an instance to be valid.
     */
    export interface LazyOptions {
        host?: string;
        port?: number;
        prefix?: string;
        views?: {[id: string]: LazyDesignViews};
        autoConnect?: boolean;
        logLevel?: LazyFormatLogger.LogLevel;
        cache: boolean;
        raw: boolean;
        forceSave: boolean;
    }

    export interface LazyViewParams {
        key?: string,
        keys?: string[],
        startkey?: string,
        endkey?: string,
        limit?: number,
        descending?: boolean,
        include_docs?: boolean,
        group?: boolean,
        reduce?: boolean
    }

    /**
     * Enumeration of status for Database creation
     */
    export enum DbCreateStatus {
        Created = 1 << 0,
        UpToDate = 1 << 1,
        UpdateNeeded = 1 << 2,
        Created_Without_Views = 1 << 3,
        Not_Connected = 1 << 4,
        Error = 1 << 5
    }

    /**
     * Enumeration of status for Database drop
     */
    export enum DbDropStatus {
        Dropped = 3 << 0,
        Conflict = 3 << 1,
        Error = 3 << 2
    }

    /**
     * Enumeration of status for Entry creation
     */
    export enum InstanceCreateStatus {
        Created = 5 << 0,
        Conflict = 5 << 1,
        Updated = 5 << 2,
        Error = 5 << 3
    }

    /**
     * Definition of the callback function when {@link LazyBoy.InitializeAllDatabases} method is invoked.
     */
    export interface DbInitializeAllCallback {
        /**
         * In order to establish a status of the result of the initialization process,
         * that function will have an {Error} parameter that could be {@code null}
         * @param error {@link Error} that error could be coming from 'CouchDB Server' or from 'LazyBoy' it can be null.
         * @param result {@link ReportInitialization}
         */
        (error: Error, result: ReportInitialization): void;
    }

    /**
     * Definition of the callback function when {@link LazyBoy.InitializeDatabase} method is invoked.
     */
    export interface DbCreationCallback {
        /**
         * On each {@link LazyBoy.InitializeDatabase} call a callback is expected to get the status.
         * An {@link Error} could be raise, if everything went well the argument 'error' will be null.
         * The state of the database status will be determine by the value of 'result' as {DbCreateStatus}.
         * The 'dbName' will be provide if needed.
         * @param error {@link Error} that error could be coming from 'CouchDB Server' or from 'LazyBoy' it can be null.
         * @param result {@link DbCreateStatus} indicator of the status of the db.
         * @param [dbName] {@link string} database name which was initialize.
         */
        (error: Error, result: DbCreateStatus, dbName?: string): void;
    }

    /**
     * Definition of the callback function when {LazyBoy.AddEntry} method is invoked.
     */
    export interface InstanceCreateCallback {
        /**
         *
         * @param error {@link Error} that error could be coming from 'CouchDB Server' or from 'LazyBoy' it can be null.
         * @param result {@link InstanceCreateStatus}
         * @param entry {@link LazyInstance}
         */
        (error: Error, result: InstanceCreateStatus, entry?: LazyInstance): void;
    }

    /**
     * Definition of the callback function when {LazyBoy.GetEntry} method is invoked.
     */
    export interface InstanceGetCallback {
        /**
         *
         * @param error {@link Error} that error could be coming from 'CouchDB Server' or from 'LazyBoy' it can be null.
         * @param result
         */
        (error: Error, result: LazyInstance): void;
    }

    /**
     * Definition of the callback function when {LazyBoy.DropDatabase} method is invoked.
     */
    export interface DropCallback {
        /**
         *
         * @param error {@link Error} that error could be coming from 'CouchDB Server' or from 'LazyBoy' it can be null.
         * @param result {@link Object}
         */
        (error: Error, result: any): void;
    }

    /**
     * Definition of an custom {@link Error} that can be raised and managed by upper layers.
     * If one of the callback return an {@link Error} different from 'null'
     * the upper layer can check if the name value is equal to "LazyBoyError"
     */
    export class LazyBoyError implements Error {
        public name: string;
        public message: string;

        constructor(message?: string) {
            this.name = "LazyBoyError";
            this.message = message;
            Log.e("LazyBoyJs", this.name, message);
        }
    }

    export interface ReportInitialization {
        success: Array<CreateReportEntry>;
        fail: Array<CreateReportEntry>;
    }

    /**
     * Definition of the report produce each time {@link LazyBoy.InitializeAllDatabases} method is invoked.
     */
    export interface CreateReportEntry {
        name: string;
        status: DbCreateStatus;
    }

    export class LazyConst {
        static DesignViews = "_design/views";
        static View_Error_Missing = "missing";
        static View_Error_Deleted = "deleted";
    }

    export class LazyBase {

        /**
         *
         * @param instance {Object}
         * @param type {string}
         * @returns {LazyInstance}
         */
        public static NewEntry: (instance: any, type?: string) => LazyInstance = (instance: any, type?: string) => {
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

        public host: string;
        public port: number;
        public options: LazyOptions;

        protected _connection: Cradle.Connection;
        protected _options: Cradle.Options;
        protected _dbNames: string[] = [];
        protected _dbs: {[id: string]: Cradle.Database} = {};


        constructor(options?: LazyOptions) {
            if (options && options.logLevel) {
                Log = new LazyFormatLogger.Logger(options.logLevel);
            }
            this.options = options;
            this._initParams();
        }

        /**
         * Initialization of parameter and {options} object.
         * It will create default {options} object.
         * By default autoConnect it force to ensure use quickly.
         * @private
         */
        private _initParams = (): void => {
            if (!this.options) {
                this.options = {
                    host: "127.0.0.1",
                    port: 5984,
                    prefix: "lazy",
                    autoConnect: true,
                    views: {},
                    cache: true,
                    raw: false,
                    forceSave: true
                };
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
                this.options.prefix = "lazy"
            } else {
                let p = this.options.prefix.lastIndexOf("_");
                let l = this.options.prefix.length;
                if (p === l - 1) {
                    this.options.prefix = this.options.prefix.substr(0, p);
                }
            }
            // maybe adding https support ...
            this._options = {cache: this.options.cache, raw: this.options.raw, forceSave: this.options.forceSave};
        };

        /**
         *
         * @param name {string}
         * @returns {boolean}
         * @private
         */
        protected _injectDatabaseName = (name: string): boolean => {
            try {
                let n = name;
                if (this.options.prefix) {
                    n = this.options.prefix + "_" + n;
                }
                let t = this._dbNames.push(n);
                return t > -1;
            } catch (exception) {
                Log.i("LazyBase", "_injectDatabaseName", exception);
            }
            return false;
        };

        /**
         *
         * @returns {string}
         * @private
         */
        protected _newGUID = (): string => {
            let s4 = (): string => {
                return Math.floor((1 + Math.random()) * 65536).toString(16).substring(1);
            };
            return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4()
        };

        /**
         *
         * @param dbName
         * @returns {Object}
         * @private
         */
        protected _getDb = (dbName: string): Cradle.Database => {
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
        protected _formatDbName = function (dbName: string) {
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
        protected _putDb = (dbName: string, db: Cradle.Database): boolean => {
            if (dbName == null || dbName.length == 0) {
                return false;
            }
            dbName = this._formatDbName(dbName);
            this._dbs[dbName] = db;
            return true;
        };

    }

    export class LazyBoy extends LazyBase {


        public hasConnection = (): boolean => {
            return !!this._connection;
        };
        private _cOaC: DbInitializeAllCallback = (error: any, result: ReportInitialization) => {
            Log.d("LazyBoy", "_cOaC", error, result);
        };
        private _report: ReportInitialization = {
            success: [],
            fail: []
        };

        constructor(options?: LazyOptions) {
            super(options);
            if (this.options) {
                this.options.autoConnect ? this.Connect() : false;
            }
        }

        /**
         * Loading in memory all connections using the dbs names and the Cradle.Connection.
         * @return {LazyBoy}
         */
        public Connect(): this {
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
        public Databases(...names: string[]): this {
            for (let name of names) {
                this._injectDatabaseName(name);
            }
            return this;
        }

        /**
         * Using the database's name push through {@link LazyBoy#Databases} function
         * @param callback {DbCreationCallback}
         */
        public InitializeAllDatabases(callback: DbInitializeAllCallback): void {
            this._cOaC = callback;
            let n = this._dbNames.splice(0, 1);
            this.InitializeDatabase(n[0], this._continueCreate);
        }

        /**
         * @param name {string}
         * @param callback {DbCreationCallback}
         */
        public InitializeDatabase(name: string, callback: DbCreationCallback): void {
            if (!this._connection) {
                return callback(null, DbCreateStatus.Not_Connected, name);
            }
            name = this._formatDbName(name);
            let db = this._getDb(name);
            if (!db) {
                db = this._connection.database(name);
                this._putDb(name, db);
            }
            db.exists((error: any, exist: boolean): void => {
                if (error) {
                    Log.e("LazyBoy", "InitializeDatabase", "db.exists", error);
                    return callback(null, DbCreateStatus.Error, name);
                }
                if (exist) {
                    Log.i("LazyBoy", "InitializeDatabase", "db exist " + name + "");
                    this._validateDesignViews(db, (error, status): void => {
                        let stat = error ? DbCreateStatus.Error : status;
                        return callback(null, stat, name);
                    });
                } else {
                    Log.i("LazyBoy", "InitializeDatabase", "creating " + name + "");
                    db.create((error: any): void => {
                        if (error) {
                            Log.i(error);
                            return callback(null, DbCreateStatus.Error, name);
                        }
                        this._validateDesignViews(db, (error, status): void => {
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
        public AddEntry(dbName: string, entry: LazyInstance, callback: InstanceCreateCallback): void {
            let id = this._newGUID();
            if (entry.type) {
                id = entry.type + "_" + id;
            }
            let t = new Date().getTime();
            entry.created = t;
            entry.modified = t;
            let db = this._getDb(dbName);
            if (db) {
                db.save(id, entry, (error: any, result: any): void => {
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
            } else {
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
        public GetEntry(dbName: string, entryId: string, callback: InstanceGetCallback): void {
            let db = this._getDb(dbName);
            if (db) {
                db.get(entryId, (error: Error, document: any): void => {
                    if (error) {
                        return callback(error, null);
                    }
                    return callback(null, document);
                });
            } else {
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
        public DeleteEntry(dbName: string, entry: LazyInstance, callback: (error: any, deleted: boolean) => void, trueDelete: boolean) {
            if (trueDelete) {
                let db = this._getDb(dbName);
                if (db) {
                    db.remove(entry._id, entry._rev, (error: any, result: any): void => {
                        if (error) {
                            return callback(error, false);
                        }
                        Log.i("DeleteEntry", result);
                        return callback(null, true);
                    });
                } else {
                    return callback(new LazyBoyError("database doesn't exist or not managed"), null);
                }
            } else {
                this.GetEntry(dbName, entry._id, (error: any, document: any): void => {
                    if (error) {
                        return callback(error, false);
                    } else {
                        document.isDeleted = true;
                        this.UpdateEntry(dbName, document, (error: any, updated: boolean): void => {
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
        public UpdateEntry(dbName: string, entry: LazyInstance, callback: (error: any, updated: boolean, data: LazyInstance) => void) {
            let db = this._getDb(dbName);
            if (db) {
                db.save(entry._id, entry._rev, entry, (error: any, result: any): void => {
                    if (error) {
                        return callback(error, false, entry);
                    }
                    entry._rev = result._rev;
                    return callback(null, true, entry);
                });
            } else {
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
        public GetViewResult(dbName: string, viewName: string, params: LazyViewParams, callback: (error: any, result: any) => void): void {
            let db = this._getDb(dbName);
            if (db) {
                db.view("views/" + viewName, params, (error: any, result: any): void => {
                    if (error) {
                        Log.e("LazyBoy", "GetViewResult", error);
                        throw error;
                    }
                    return callback(null, result);
                });
            } else {
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
        public AddView(dbName: string, viewName: string, view: LazyView, callback: (error: any, result: boolean) => void): void {
            let db = this._getDb(dbName);
            if (!db) {
                return callback(new LazyBoyError("database doesn't exist or not managed"), false);
            }
            let designView: LazyDesignViews = this.options.views[this._formatDbName(dbName)];
            if (!designView) {
                designView = {version: 1, type: 'javascript', views: {}};
                designView.views[viewName] = view;
            } else {
                designView.version++;
                designView.views[viewName] = view;
            }
            this.options.views[this._formatDbName(dbName)] = designView;
            this._validateDesignViews(db, (error: any, result: DbCreateStatus): void => {
                Log.d("LazyBoy", "AddView", error, result);
                callback(null, result == DbCreateStatus.Created || result == DbCreateStatus.UpToDate);
            });
        }

        /**
         * Shorter to destroy all managed databases.
         * @param callback {function(error: Error, report: object}
         */
        public DropDatabases(callback: (error: any, report: any) => void): void {
            let report = {
                dropped: ["name"],
                fail: ["name"]
            };
            report.dropped = [];
            report.fail = [];
            for (let name in this._dbs) {
                if (this._dbs.hasOwnProperty(name)) {
                    let db = this._dbs[name];
                    db.destroy((error: any): void => {
                        if (error) {
                            Log.e("LazyBoy", "DropDatabases", "db.destroy", error);
                            report.fail.push(db.name);
                            if (report.dropped.length + report.fail.length == Object.keys(this._dbs).length) {
                                return callback(null, report);
                            }
                            //throw error;
                        } else {
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
        public DropDatabase(dbName: string, callback: DropCallback): void {
            let db = this._getDb(dbName);
            let dbArray = this._dbs;
            if (db) {
                db.destroy(function (error) {
                    if (error) {
                        return callback(error, DbDropStatus.Error);
                    }
                    delete dbArray[dbName];
                    return callback(null, DbDropStatus.Dropped)
                });
            } else {
                return callback(new LazyBoyError("database doesn't exist or not managed"), null);
            }
        }

        /**
         * In order to create or update some views for a DB, a validation must be done using the "version" property
         * of the {@link LazyDesignViews#version}
         * @param db {object} database object.
         * @param callback {@link DbCreationCallback}
         * @private
         */
        private _validateDesignViews = (db: Cradle.Database, callback: DbCreationCallback): void => {
            if (!this.options || !this.options.views) {
                return callback(null, DbCreateStatus.Created_Without_Views);
            }
            let designView: LazyDesignViews = this.options.views[db.name];
            if (!designView) {
                return callback(null, DbCreateStatus.Created_Without_Views);
            }
            let evaluateView = (error: any, result: boolean): void => {
                let s = result ? DbCreateStatus.Created : DbCreateStatus.Error;
                return callback(error, s);
            };
            db.get(LazyConst.DesignViews, (error: any, document: any): void => {
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
                    } else {
                        return callback(error, DbCreateStatus.Error);
                    }
                } else if (document) {
                    if (document.version < designView.version) {
                        this._saveViews(db, designView, evaluateView);
                    } else {
                        return callback(null, DbCreateStatus.UpToDate);
                    }
                } else {
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
        private _saveViews = (db: Cradle.Database, views: LazyDesignViews, callback: (error: any, result: boolean) => void): void => {
            if (views) {
                db.save(LazyConst.DesignViews, views, (error: any, result: any): void => {
                    if (error) {
                        Log.e("LazyBoy", "_saveViews", error);
                        return callback(error, false);
                    }
                    Log.d("LazyBoy", "_saveViews", result);
                    return callback(null, true);
                });
            } else {
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
        private _continueCreate: DbCreationCallback = (error: Error, status: DbCreateStatus, name?: string): void => {
            let success = DbCreateStatus.Created | DbCreateStatus.Created_Without_Views | DbCreateStatus.UpToDate;
            let fail = DbCreateStatus.Error | DbCreateStatus.Not_Connected;
            let r = {name: name, status: status};
            if (status & fail || error) {
                if (error) {
                    Log.c("LazyBoy", "InitializeDatabase", "_continueCreate", error);
                }
                this._report.fail.push(r);
            } else if (status & success) {
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

    }

    export class LazyBoyAsync extends LazyBase {

        hasConnection = (): boolean => {
            return !!this._connection;
        };

        constructor(options?: LazyOptions) {
            super(options);
            if (this.options) {
                this.options.autoConnect ? this.ConnectAsync() : false;
            }
        }

        /**
         * Loading in memory all connections using the dbs names and the Cradle.Connection.
         * @return {Promise<boolean>}
         */
        async ConnectAsync(): Promise<boolean> {
            return new Promise<boolean>((resolve, reject) => {
                let result: boolean = false;
                try {
                    Log.d("LazyBoyAsync", "ConnectAsync", "initiating connection using Cradle");
                    this._connection = new Cradle.Connection(this.host, this.port, this._options);
                    for (let name of this._dbNames) {
                        Log.d("LazyBoyAsync", "ConnectAsync", "initiating connection to db " + name);
                        this._dbs[name] = this._connection.database(name);
                    }
                    result = true;
                    return resolve(result);
                } catch (exception) {
                    Log.c("LazyBoyAsync", "ConnectAsync", exception);
                    return reject(exception);
                }
            });
        }

        /**
         * Shorter to add databases to
         * @param names {Array} of strings representing the db name.
         * @return {LazyBoy}
         */
        Databases(...names: string[]): this {
            for (let name of names) {
                this._injectDatabaseName(name);
            }
            return this;
        }

        /**
         * Using the database's name push through {@link LazyBoy#Databases} function
         * @return {Promise<ReportInitialization>}
         */
        async InitializeAllDatabasesAsync(): Promise<ReportInitialization> {
            return new Promise<ReportInitialization>(async(resolve, reject) => {
                let gReport: ReportInitialization = {success: [], fail: []};
                let success = DbCreateStatus.Created | DbCreateStatus.Created_Without_Views | DbCreateStatus.UpToDate;
                let fail = DbCreateStatus.Error | DbCreateStatus.Not_Connected;
                try {
                    for (let name of this._dbNames) {
                        let report = await this.InitializeDatabaseAsync(name);
                        if (report.status & success) {
                            gReport.success.push(report);
                        } else if (report.status & fail) {
                            gReport.fail.push(report);
                        }
                        if ((gReport.success.length + gReport.fail.length) === this._dbNames.length) {
                            return resolve(gReport);
                        }
                    }
                } catch (exception) {
                    Log.c("LazyBoyAsync", "InitializeAllDatabasesAsync", exception);
                    return reject(exception);
                }
            });
        }

        /**
         * @param name {string}
         * @return {Promise<{status: DbCreateStatus, name: string}>}
         */
        async InitializeDatabaseAsync(name: string): Promise<{status: DbCreateStatus, name: string}> {
            return new Promise<{status: DbCreateStatus, name: string}>((resolve, reject) => {
                let r: {status: DbCreateStatus, name: string} = {status: DbCreateStatus.Not_Connected, name: name};
                try {
                    if (!this._connection) {
                        return resolve(r);
                    }
                    Log.i("LazyBoyAsync", "InitializeDatabaseAsync", "initializing database " + name);
                    let db = this._getAndConnectDb(name);
                    r.name = db.name;
                    db.exists(async(error: any, exist: boolean) => {
                        if (error) {
                            Log.e("LazyBoyAsync", "InitializeDatabaseAsync", "db.exists", error);
                            r.status = DbCreateStatus.Error;
                            return resolve(r);
                        }
                        if (exist) {
                            Log.i("LazyBoyAsync", "InitializeDatabaseAsync", "db exist " + name + "");
                            let report = await this._validateDesignViewsAsync(db);
                            r.status = report.error ? DbCreateStatus.Error : report.status;
                            return resolve(r);
                        } else {
                            Log.i("LazyBoyAsync", "InitializeDatabaseAsync", "creating " + name + "");
                            db.create(async(error: any) => {
                                if (error) {
                                    Log.i(error);
                                    r.status = DbCreateStatus.Error;
                                    return resolve(r);
                                }
                                let report = await this._validateDesignViewsAsync(db);
                                r.status = report.error ? DbCreateStatus.Error : report.status;
                                return resolve(r);
                            });
                        }
                    });
                } catch (exception) {
                    Log.c("LazyBoyAsync", "InitializeDatabaseAsync", exception);
                    return reject(exception)
                }
            });
        }

        /**
         * For an easy manage of instance all object push to a 'lazy db' will be encapsulated inside an {@link LazyInstance}.
         * @param dbName {string} database name where to insert data.
         * @param data {object}
         * @return {Promise<{error: Error, result: InstanceCreateStatus, entry?: LazyInstance}>}
         */
        async AddEntryAsync(dbName: string, data: {type?: string, data: Object}): Promise<{error: Error, result: InstanceCreateStatus, entry?: LazyInstance}> {
            return new Promise<{error: Error, result: InstanceCreateStatus, entry?: LazyInstance}>((resolve, reject) => {
                let r: {error: Error, result: InstanceCreateStatus, entry?: LazyInstance} = {
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
                    db.save(id, entry, (error: any, result: any): void => {
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
                } catch (exception) {
                    Log.c("LazyBoyAsync", "AddEntryAsync", exception);
                    return reject(exception)
                }
            });
        }

        /**
         * Shorter to retrieve instance inside the database.
         * @param dbName {string} database name where to search.
         * @param entryId {string} CouchDB id of the instance to fetch.
         * @return {Promise<{error: Error, data: LazyInstance}>}
         */
        async GetEntryAsync(dbName: string, entryId: string): Promise<{error: any, data: LazyInstance}> {
            return new Promise<{error: Error, data: LazyInstance}>((resolve, reject) => {
                let r: {error: Error, data: LazyInstance} = {error: null, data: null};
                try {
                    let db = this._getAndConnectDb(dbName);
                    db.get(entryId, (error: Error, document: any): void => {
                        r.error = error;
                        if (error) {
                            r.data = null;
                            return resolve(r);
                        }
                        r.data = document;
                        return resolve(r);
                    });
                } catch (exception) {
                    Log.c("LazyBoyAsync", "GetEntryAsync", exception);
                    return reject(exception)
                }
            });
        }

        /**
         * Shorter to delete an entry from a specific database.
         * @param dbName {string} name of the database where to delete.
         * @param entry {LazyInstance} instance to delete.
         * @param trueDelete {boolean} flag to force permanent delete, with default value to false
         * @return {Promise<{error: Error, deleted: boolean}>}
         */
        async DeleteEntryAsync(dbName: string, entry: LazyInstance, trueDelete: boolean = false): Promise<{error: Error, deleted: boolean}> {
            return new Promise<{error: Error, deleted: boolean}>(async(resolve, reject) => {
                let r: {error: Error, deleted: boolean} = {error: null, deleted: false};
                try {
                    if (trueDelete) {
                        let db = this._getAndConnectDb(dbName);
                        db.remove(entry._id, entry._rev, (error: any, result: any): void => {
                            r.error = error;
                            if (error) {
                                r.deleted = false;
                                return resolve(r);
                            }
                            Log.i("DeleteEntry", result);
                            r.deleted = true;
                            return resolve(r);
                        });
                    } else {
                        let gRep = await this.GetEntryAsync(dbName, entry._id);
                        r.error = gRep.error;
                        if (r.error) {
                            r.deleted = false;
                            return resolve(r);
                        } else {
                            gRep.data.isDeleted = true;
                            let report = await this.UpdateEntryAsync(dbName, gRep.data);
                            r.error = report.error;
                            r.deleted = report.updated;
                            return resolve(r);
                        }
                    }
                } catch (exception) {
                    Log.c("LazyBoyAsync", "DeleteEntryAsync", exception);
                    return reject(exception)
                }
            });
        }

        /**
         * Shorter to update an entry in a specific databases.
         * @param dbName {string} name of the database where to update.
         * @param entry {LazyInstance} instance to update.
         * @return {Promise<{error: Error, updated: boolean, data: LazyInstance}>}
         */
        async UpdateEntryAsync(dbName: string, entry: LazyInstance): Promise<{error: Error, updated: boolean, data: LazyInstance}> {
            return new Promise<{error: Error, updated: boolean, data: LazyInstance}>((resolve, reject) => {
                let r: {error: Error, updated: boolean, data: LazyInstance} = {error: null, updated: false, data: null};
                try {
                    let db = this._getAndConnectDb(dbName);
                    db.save(entry._id, entry._rev, entry, (error: any, result: any): void => {
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
                } catch (exception) {
                    Log.c("LazyBoyAsync", "UpdateEntryAsync", exception);
                    return reject(exception)
                }
            });
        }

        /**
         * Shorter to access the result of a view calculation.
         * @param dbName {string} database name where the request should be executed.
         * @param viewName {string} view name initialize the request.
         * @param params {lazyboyjs.LazyViewParams} actual value to search inside the view.
         * @return {Promise<{error: Error, result: any}>}
         */
        async GetViewResultAsync(dbName: string, viewName: string, params: LazyViewParams): Promise<{error: Error, result: any}> {
            return new Promise<{error: Error, result: any}>((resolve, reject) => {
                let r: {error: Error, result: any} = {error: null, result: null};
                try {
                    let db = this._getAndConnectDb(dbName);
                    db.view("views/" + viewName, params, (error: any, result: any): void => {
                        r.error = error;
                        r.result = result;
                        if (error) {
                            Log.e("LazyBoyAsync", "GetViewResultAsync", error);
                        }
                        return resolve(r);
                    });
                } catch (exception) {
                    Log.c("LazyBoyAsync", "GetViewResultAsync", exception);
                    return reject(exception)
                }
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
        async AddViewAsync(dbName: string, viewName: string, view: LazyView): Promise<{error: Error, result: boolean}> {
            return new Promise<{error: Error, result: boolean}>(async(resolve, reject) => {
                let r: {error: Error, result: boolean} = {error: null, result: false};
                try {
                    let db = this._getAndConnectDb(dbName);
                    let d = await this._getDesignViewsAsync(db);
                    let design = d.result;
                    let mem = this.options.views[db.name];
                    if (!mem && !design || mem && !design) {
                        this._updateView(dbName, viewName, view);

                    } else if (!mem && design) { //get from db or delete ?
                        this.options.views[db.name] = design;
                        mem = this.options.views[db.name];

                    }
                    if (mem && design) {
                        mem["_rev"] = design["_rev"];
                        if (!mem.views[viewName]) {
                            this._updateView(dbName, viewName, view);
                        } else if (mem.views[viewName]) {
                            let a = mem.views[viewName].map.toString();
                            let c = view.map.toString();
                            if (a !== c) {
                                this._updateView(dbName, viewName, view);
                            }

                        }
                    }

                    let report = await this._validateDesignViewsAsync(db);
                    r.error = report.error;
                    r.result = (report.status == DbCreateStatus.Created || report.status == DbCreateStatus.UpToDate);
                    return resolve(r);
                } catch (exception) {
                    Log.c("LazyBoyAsync", "AddViewAsync", exception);
                    return reject(exception)
                }
            });
        }

        /**
         *
         * @param dbName {string} database name where to push the desing view.
         * @param views {Object}
         * @return {Promise<{error: Error, result: boolean}>}
         * @constructor
         */
        async AddViewsAsync(dbName: string, views: {name: string, view: LazyView}[]): Promise<{error: Error, result: boolean}> {
            return new Promise<{error: Error, result: boolean}>(async(resolve, reject) => {
                let r: {error: Error, result: boolean} = {error: null, result: false};
                try {
                    for (let view of views) {
                        this._updateView(dbName, view.name, view.view);
                    }
                    let db = this._getAndConnectDb(dbName);
                    let report = await this._validateDesignViewsAsync(db);
                    r.error = report.error;
                    r.result = (report.status == DbCreateStatus.Created || report.status == DbCreateStatus.UpToDate);
                    return resolve(r);
                } catch (exception) {
                    Log.c("LazyBoyAsync", "AddViewsAsync", exception);
                    return reject(exception)
                }
            });
        }

        /**
         * Shorter to destroy all managed databases.
         * @return {Promise<{success: string[], fail: string[]}>}
         */
        async DropAllDatabasesAsync(): Promise<{success: string[], fail: string[]}> {
            return new Promise<{success: string[], fail: string[]}>(async(resolve, reject) => {
                let r: {success: string[], fail: string[]} = {success: [], fail: []};
                try {
                    for (let name of this._dbNames) {
                        let report = await this.DropDatabaseAsync(name);
                        if (report.error) {
                            r.fail.push(name);
                        } else {
                            r.success.push(name);
                        }
                    }
                    return resolve(r);
                } catch (exception) {
                    Log.c("LazyBoyAsync", "DropAllDatabasesAsync", exception);
                    return reject(exception)
                }
            });
        }

        /**
         * Shorter to destroy a specific managed database.
         * @param dbName {string} name of the database to destroy.
         * @return {Promise<{error: Error, status: DbDropStatus}>}
         */
        async DropDatabaseAsync(dbName: string): Promise<{error: Error, status: DbDropStatus}> {
            return new Promise<{error: Error, status: DbDropStatus}>((resolve, reject) => {
                let r: {error: Error, status: DbDropStatus} = {error: null, status: DbDropStatus.Error};
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
                } catch (exception) {
                    Log.c("LazyBoyAsync", "DropDatabaseAsync", exception);
                    return reject(exception)
                }
            });
        }

        async AddAttachment(dbName: string, entryId: string, rev: string, data: any): Promise<{error: any, status: any}> {
            return new Promise<{error: any, status: any}>((resolve) => {
                let r: {error: any, status: any} = {error: null, status: 0};
                let db = this._getDb(dbName);
                if (!db) {
                    db = this._getAndConnectDb(dbName);
                }
                db.saveAttachment({id: entryId, rev: rev}, data, (err, reply) => {
                    r.error = err;
                    if (err) {
                        Log.e("LazyBoyAsync", "AddAttachment", "saveAttachment", err);
                    }
                    r.status = reply;
                    resolve(r);
                });
            });
        }

        async AddFileAsAttachmentAsync(dbName: string, entryId: string, rev: string, name: string, path: string): Promise<{error: any, status: any}> {
            return new Promise<{error: any, status: any}>((resolve) => {
                let r: {error: any, status: any} = {error: null, status: 0};
                let db = this._getAndConnectDb(dbName);
                let attachmentData = {
                    name: name,
                    'Content-Type': mime.lookup(path)
                };
                let readStream = fs.createReadStream(path);
                let writeStream = db.saveAttachment({id: entryId, rev: rev}, attachmentData, (err, reply) => {
                    r.error = err;
                    if (err) {
                        Log.e("LazyBoyAsync", "AddAttachment", "saveAttachment", err);
                    }
                    r.status = reply;
                    resolve(r);
                });
                readStream.pipe(writeStream);
            });
        }

        async GetAttachmentStreamAsync(dbName: string, entryId: string, attachmentName: string): Promise<any> {
            return new Promise<any>(async(resolve, reject) => {
                try {
                    Log.d("LazyBoyAsync", "GetAttachmentAsync", entryId, attachmentName);
                    let db = this._getAndConnectDb(dbName);
                    let data = db.getAttachment(entryId, attachmentName, undefined);
                    Log.d("LazyBoyAsync", "GetAttachmentAsync", data);
                    return resolve(data);
                } catch (exception) {
                    Log.c("LazyBoyAsync", "GetAttachmentAsync", exception);
                    return reject(exception)
                }
            });
        }

        async GetAttachmentAsync(dbName: string, entryId: string, attachmentName: string): Promise<any> {
            return new Promise<any>(async(resolve, reject) => {
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
                } catch (exception) {
                    Log.c("LazyBoyAsync", "GetAttachmentAsync", exception);
                    return reject(exception)
                }
            });
        }


        async GetAttachmentInfoAsync(dbName: string, entryId: string, attachmentName: string): Promise<CouchAttachment> {
            return new Promise<CouchAttachment>(async(resolve, reject) => {
                try {
                    let get = await this.GetEntryAsync(dbName, entryId);
                    if (!get.data._attachments || !get.data._attachments[attachmentName]) {
                        return resolve(null);
                    }
                    return resolve(get.data._attachments[attachmentName]);
                } catch (exception) {
                    Log.c("LazyBoyAsync", "GetAttachmentInfoAsync", exception);
                    return reject(exception)
                }
            });
        }

        /**
         *
         * @param dbName
         * @param viewName
         * @param view
         * @private
         */
        private _updateView(dbName: string, viewName: string, view: LazyView): void {
            Log.d("LazyBoyAsync", "_updateView", dbName, viewName);
            let designView: LazyDesignViews = this.options.views[this._formatDbName(dbName)];
            if (!designView) {
                designView = {version: 1, type: 'javascript', views: {}};
                designView.views[viewName] = view;
            } else {
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
        private _getAndConnectDb(name: string): Cradle.Database {
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
        private async _validateDesignViewsAsync(db: Cradle.Database): Promise<{error: Error, status: DbCreateStatus}> {
            return new Promise<{error: Error, status: DbCreateStatus}>(async(resolve, reject) => {
                let r: {error: Error, status: DbCreateStatus} = {error: null, status: DbCreateStatus.Error};
                try {
                    if (!this.options || !this.options.views) {
                        r.status = DbCreateStatus.Created_Without_Views;
                        return resolve(r);
                    }
                    let designView: LazyDesignViews = this.options.views[db.name];
                    if (!designView) {
                        r.status = DbCreateStatus.Created_Without_Views;
                        return resolve(r);
                    }
                    db.get(LazyConst.DesignViews, async(error: any, document: any) => {
                        if (error) {
                            if (error.reason) {
                                switch (error.reason) {
                                    case LazyConst.View_Error_Missing:
                                    case LazyConst.View_Error_Deleted:
                                        Log.d("LazyBoyAsync", "_validateDesignViewsAsync", "Missing view");
                                        let report = await this._saveViewsAsync(db, designView);
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
                            } else {
                                r.error = error;
                                r.status = DbCreateStatus.Error;
                                return resolve(r);
                            }
                        } else if (document) {
                            Log.d("LazyBoyAsync", "_validateDesignViewsAsync", document.version, designView.version);
                            if (document.version < designView.version) {
                                let report = await this._saveViewsAsync(db, designView);
                                r.error = report.error;
                                r.status = report.result ? DbCreateStatus.Created : DbCreateStatus.Created_Without_Views;
                                r.status = r.error ? DbCreateStatus.Error : r.status;
                                return resolve(r);
                            } else {
                                r.error = null;
                                r.status = DbCreateStatus.UpToDate;
                                return resolve(r);
                            }
                        } else {
                            r.error = null;
                            r.status = DbCreateStatus.Created_Without_Views;
                            return resolve(r);
                        }

                    });
                } catch (exception) {
                    Log.c("LazyBoyAsync", "_validateDesignViewsAsync", exception);
                    return reject(exception)
                }
            });
        }

        async _getDesignViewsAsync(db: Cradle.Database): Promise<{error: Error, result: any}> {
            return new Promise<{error: Error, result: any}>((resolve, reject) => {
                let r: {error: Error, result: any} = {error: null, result: null};
                try {
                    db.get(LazyConst.DesignViews, (error: any, document: any) => {
                        if (error) {
                            Log.e("LazyBoyAsync", "_getDesignViewsAsync", error);
                        }
                        r.result = document;
                        r.error = error;
                        return resolve(r);
                    });
                } catch (exception) {
                    Log.c("LazyBoyAsync", "_validateDesignViewsAsync", exception);
                    return reject(exception)
                }
            });
        }

        /**
         * Shorter to save and validate the {views} of a specific database.
         * @param db {object}
         * @param views {LazyDesignViews}
         * @return {Promise<{error: Error, result: boolean}>}
         * @private
         */
        private async _saveViewsAsync(db: Cradle.Database, views: LazyDesignViews): Promise<{error: Error, result: boolean}> {
            return new Promise<{error: Error, result: boolean}>((resolve, reject) => {
                let r: {error: Error, result: boolean} = {error: null, result: false};
                try {
                    if (views) {
                        db.save(LazyConst.DesignViews, views, (error: any, result: any): void => {
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
                    } else {
                        return resolve(r);
                    }
                } catch (exception) {
                    Log.c("LazyBoyAsync", "_saveViewsAsync", exception);
                    return reject(exception)
                }
            });
        }
    }
}