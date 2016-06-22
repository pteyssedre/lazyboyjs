/// <reference path="../typings/index.d.ts" />

import * as Cradle from "cradle";

export module lazyboyjs {

    export interface LazyInstance {
        _id?: string;
        _rev?: string;
        created: number;
        modified: number;
        isDeleted: boolean;
        type: string;
        instance: any;
    }

    export interface LazyView {
        map: any;
        reduce: any;
    }

    export interface LazyDesignViews {
        version: number;
        type: string;
        views: {[id: string]: LazyView};
    }

    export interface LazyOptions {
        host?: string;
        port?: number;
        prefix?: string;
        views?: {[id: string]: LazyDesignViews};
        autoConnect?: boolean;
    }

    export enum DbCreateStatus {
        Created = 1 << 0,
        UpToDate = 1 << 1,
        UpdateNeeded = 1 << 2,
        Created_Without_Views = 1 << 3,
        Not_Connected = 1 << 4,
        Error = 1 << 5
    }

    export enum DbDropStatus {
        Dropped = 3 << 0,
        Conflict = 3 << 1,
        Error = 3 << 2
    }

    export enum InstanceCreateStatus {
        Created = 5 << 0,
        Conflict = 5 << 1,
        Updated = 5 << 2,
        Error = 5 << 3
    }

    export interface DbInitializeAllCallback {
        (error: any, result: ReportInitialization): void;
    }

    export interface DbCreationCallback {
        (error: any, result: DbCreateStatus): void;
    }

    export interface InstanceCreateCallback {
        (error: any, result: InstanceCreateStatus, entry?: LazyInstance): void;
    }
    export interface InstanceGetCallback {
        (error: any, result: LazyInstance): void;
    }

    export interface DropCallback {
        (error: any, result: any): void;
    }

    export class LazyBoyError implements Error {
        public name: string;
        public message: string;

        constructor(message?: string) {
            this.name = "LazyBoyError";
            this.message = message;
        }
    }

    export interface ReportInitialization {
        success: Array<CreateReportEntry>;
        fail: Array<CreateReportEntry>;
    }

    export class CreateReportEntry {
        public name: string;
        public status: DbCreateStatus;
    }

    export class LazyConst {
        static DesignViews = "_design/views";
        static View_Error_Missing = "missing";
    }

    export class LazyBoy {

        public static NewEntry: (instance: any, type?: string) => LazyInstance = (instance: any, type?: string)=> {
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
        public hasConnection = (): boolean => {
            return this._connection ? true : false;
        };
        public options: LazyOptions;

        private _connection: Cradle.Connection;
        private _options: Cradle.Options;
        private _dbNames: string[] = [];
        private _dbs: { [id: string]: Cradle.Database } = {};
        private _cOaC: DbInitializeAllCallback = (error: any, result: ReportInitialization)=> {
        };
        private _report: ReportInitialization = {
            success: [],
            fail: []
        };

        constructor(options?: LazyOptions) {
            this.options = options;
            this._initParams();
        }

        /**
         * Loading in memory all connections using the dbs names and the Cradle.Connection.
         */
        Connect(): this {
            this._connection = new Cradle.Connection(this.host, this.port, this._options);
            for (var name of this._dbNames) {
                this._dbs[name] = this._connection.database(name);
            }
            return this;
        }

        /**
         *
         * @param names {Array} of strings representing the db name.
         * @return {lazyboyjs.LazyBoy}
         */
        Databases(...names: string[]): this {
            for (var name of names) {
                this._injectDatabaseName(name);
            }
            return this;
        }

        /**
         * Using the database's name push through {@link LazyBoy#Databases} function
         * @param callback
         */
        InitializeAllDatabases(callback: DbInitializeAllCallback): void {
            this._cOaC = callback;
            let n = this._dbNames.splice(0, 1);
            this.InitializeDatabase(n[0], this._continueCreate);
        }

        /**
         * @param name {string}
         * @param callback {function}
         */
        InitializeDatabase(name: string, callback: DbCreationCallback): void {
            if (!this._connection) {
                return callback(name, DbCreateStatus.Not_Connected);
            }
            name = this._formatDbName(name);
            console.log("INFO", new Date(), "initializing " + name + "");
            let db = this._getDb(name);
            if (!db) {
                db = this._connection.database(name);
                this._putDb(name, db);
            }
            db.exists((error: any, exist: boolean): void => {
                if (error) {
                    return callback(name, DbCreateStatus.Error);
                }
                if (exist) {
                    console.log("INFO", new Date(), "db exist " + name + "");
                    this._validateDesignViews(db, (error, status): void => {
                        let stat = error ? DbCreateStatus.Error : status;
                        return callback(name, stat);
                    });
                } else {
                    console.log("INFO", new Date(), "creating " + name + "");
                    db.create((error: any): void => {
                        if (error) {
                            console.log(error);
                            return callback(name, DbCreateStatus.Error);
                        }
                        this._validateDesignViews(db, (error, status): void => {
                            let stat = error ? DbCreateStatus.Error : status;
                            return callback(name, stat);
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
                db.save(id, entry, (error: any, result: any): void=> {
                    if (error) {
                        console.error(error);
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
        };

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

        public DeleteEntry(dbName: string, entry: LazyInstance, callback: (error: any, deleted: boolean)=>void, trueDelete: boolean) {
            if (trueDelete) {
                let db = this._getDb(dbName);
                if (db) {
                    db.remove(entry._id, entry._rev, (error: any, result: any): void => {
                        if (error) {
                            return callback(error, false);
                        }
                        console.log("DeleteEntry", result);
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

        public UpdateEntry(dbName: string, entry: LazyInstance, callback: (error: any, updated: boolean, data: LazyInstance)=> void) {
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
         * @param params {{key: string, group?: boolean, reduce?: boolean}} actual value to search inside the view.
         * @param callback {}
         */
        public GetViewResult(dbName: string, viewName: string, params: {key: string, group?: boolean, reduce?: boolean}, callback: (error: any, result: any)=>void): void {
            var db = this._getDb(dbName);
            if (db) {
                db.view("views/" + viewName, params, (error: any, result: any): void=> {
                    if (error) {
                        console.error("ERROR", new Date(), error);
                        throw error;
                    }
                    return callback(null, result);
                });
            } else {
                return callback(new LazyBoyError("database doesn't exist or not managed"), null);
            }
        }

        public AddView(dbName: string, viewName: string, view: LazyView, callback: (error: any, result: boolean)=> void): void {
            let db = this._getDb(dbName);
            if (!db) {
                return callback(new LazyBoyError("database doesn't exist or not managed"), false);
            }
            let designView: LazyDesignViews = this.options.views[this._formatDbName(dbName)];
            if (!designView) {
                designView = {version: 1, type: 'javascript', views: {}};
                designView.views[viewName] = view;
                this.options.views[this._formatDbName(dbName)] = designView;
            }
            this._validateDesignViews(db, (error: any, result: DbCreateStatus): void => {
                callback(null, result == DbCreateStatus.Created);
            });
        }

        public DropDatabases(callback: (error: any, report: any)=>void): void {
            let report = {
                dropped: ["name"],
                fail: ["name"]
            };
            report.dropped = [];
            report.fail = [];
            for (let name in this._dbs) {
                if (this._dbs.hasOwnProperty(name)) {
                    let db = this._dbs[name];
                    report.dropped.push(name);
                    db.destroy((error: any)=>void{});
                }
            }
            return callback(null, report);
        }

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
        };

        private _injectDatabaseName = (name: string): boolean => {
            try {
                let n = name;
                if (this.options.prefix) {
                    n = this.options.prefix + "_" + n;
                }
                let t = this._dbNames.push(n);
                return t > -1;
            } catch (exception) {
                console.log(exception);
            }
            return false;
        };

        private _newGUID = (): string => {
            let s4 = (): string=> {
                return Math.floor((1 + Math.random()) * 65536).toString(16).substring(1);
            };
            return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4()
        };

        private _getDb = (dbName: string): Cradle.Database => {
            if (dbName == null || dbName.length == 0) {
                return null;
            }
            dbName = this._formatDbName(dbName);
            return this._dbs[dbName];
        };

        private _formatDbName = function (dbName: string) {
            if (dbName.indexOf(this.options.prefix + "_") == -1) {
                dbName = this.options.prefix + "_" + dbName;
            }
            return dbName;
        };

        private _putDb = (dbName: string, db: Cradle.Database): boolean => {
            if (dbName == null || dbName.length == 0) {
                return false;
            }
            dbName = this._formatDbName(dbName);
            this._dbs[dbName] = db;
            return true;
        };
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
                var s = result ? DbCreateStatus.Created : DbCreateStatus.Error;
                return callback(error, s);
            };
            db.get(LazyConst.DesignViews, (error: any, document: any): void => {
                if (error) {
                    if (error.reason) {
                        switch (error.reason) {
                            case LazyConst.View_Error_Missing:
                                this._saveViews(db, designView, evaluateView);
                                break;
                            default:
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
                        console.error(error);
                        return callback(error, false);
                    }
                    //TODO: validate result object
                    return callback(null, true);
                });
            } else {
                return callback(null, true);
            }
        };
        /**
         * Callback use when {InitializeAllDatabases} is called. It will
         * continue the creation of all databases contain in {_dbNames}.
         * @param name {string} database name.
         * @param status {@link DbCreateStatus} status of the operation.
         * @private
         */
        private _continueCreate: DbCreationCallback = (name: string, status: DbCreateStatus): void => {
            var success = DbCreateStatus.Created | DbCreateStatus.Created_Without_Views | DbCreateStatus.UpToDate;
            var fail = DbCreateStatus.Error | DbCreateStatus.Not_Connected;
            var r = {name: name, status: status};
            if (status & fail) {
                this._report.fail.push(r);
            } else if (status & success) {
                this._report.success.push(r);
            }
            if (this._dbNames.length == 0) {
                let error = this._report.fail.length > 0 ? new LazyBoyError("Some db fails") : null;
                this._cOaC(error, this._report);
                this._report.success = [];
                this._report.fail = [];
                return;
            }
            let n = this._dbNames.splice(0, 1);
            this.InitializeDatabase(n[0], this._continueCreate);
        };

        /**
         * Initialization of parameter and {options} object.
         * It will create default {options} object.
         * By default autoConnect it force to ensure use quickly.
         * @private
         */
        private _initParams = (): void => {
            this._cOaC = function () {
            };
            if (!this.options) {
                this.options = {host: "127.0.0.1", port: 5984, prefix: "lazy", autoConnect: true};
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
            this._options = {cache: true, raw: false, forceSave: true};
            if (this.options) {
                this.options.autoConnect ? this.Connect() : false;
            }
        };
    }
}