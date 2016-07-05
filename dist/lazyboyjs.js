"use strict";
var Cradle = require("cradle");
var LazyFormatLogger = require("lazy-format-logger");
var lazyboyjs;
(function (lazyboyjs) {
    var Log = new LazyFormatLogger.Logger();
    (function (DbCreateStatus) {
        DbCreateStatus[DbCreateStatus["Created"] = 1] = "Created";
        DbCreateStatus[DbCreateStatus["UpToDate"] = 2] = "UpToDate";
        DbCreateStatus[DbCreateStatus["UpdateNeeded"] = 4] = "UpdateNeeded";
        DbCreateStatus[DbCreateStatus["Created_Without_Views"] = 8] = "Created_Without_Views";
        DbCreateStatus[DbCreateStatus["Not_Connected"] = 16] = "Not_Connected";
        DbCreateStatus[DbCreateStatus["Error"] = 32] = "Error";
    })(lazyboyjs.DbCreateStatus || (lazyboyjs.DbCreateStatus = {}));
    var DbCreateStatus = lazyboyjs.DbCreateStatus;
    (function (DbDropStatus) {
        DbDropStatus[DbDropStatus["Dropped"] = 3] = "Dropped";
        DbDropStatus[DbDropStatus["Conflict"] = 6] = "Conflict";
        DbDropStatus[DbDropStatus["Error"] = 12] = "Error";
    })(lazyboyjs.DbDropStatus || (lazyboyjs.DbDropStatus = {}));
    var DbDropStatus = lazyboyjs.DbDropStatus;
    (function (InstanceCreateStatus) {
        InstanceCreateStatus[InstanceCreateStatus["Created"] = 5] = "Created";
        InstanceCreateStatus[InstanceCreateStatus["Conflict"] = 10] = "Conflict";
        InstanceCreateStatus[InstanceCreateStatus["Updated"] = 20] = "Updated";
        InstanceCreateStatus[InstanceCreateStatus["Error"] = 40] = "Error";
    })(lazyboyjs.InstanceCreateStatus || (lazyboyjs.InstanceCreateStatus = {}));
    var InstanceCreateStatus = lazyboyjs.InstanceCreateStatus;
    var LazyBoyError = (function () {
        function LazyBoyError(message) {
            Log.e("LazyBoyJs", "LazyBoyError", message);
            this.name = "LazyBoyError";
            this.message = message;
        }
        return LazyBoyError;
    }());
    lazyboyjs.LazyBoyError = LazyBoyError;
    var CreateReportEntry = (function () {
        function CreateReportEntry() {
        }
        return CreateReportEntry;
    }());
    lazyboyjs.CreateReportEntry = CreateReportEntry;
    var LazyConst = (function () {
        function LazyConst() {
        }
        LazyConst.DesignViews = "_design/views";
        LazyConst.View_Error_Missing = "missing";
        return LazyConst;
    }());
    lazyboyjs.LazyConst = LazyConst;
    var LazyBoy = (function () {
        function LazyBoy(options) {
            var _this = this;
            this.hasConnection = function () {
                return _this._connection ? true : false;
            };
            this._dbNames = [];
            this._dbs = {};
            this._cOaC = function (error, result) {
                Log.d("LazyBoy", "_cOaC", error, result);
            };
            this._report = {
                success: [],
                fail: []
            };
            this._injectDatabaseName = function (name) {
                try {
                    var n = name;
                    if (_this.options.prefix) {
                        n = _this.options.prefix + "_" + n;
                    }
                    var t = _this._dbNames.push(n);
                    return t > -1;
                }
                catch (exception) {
                    Log.i("LazyBoy", "_injectDatabaseName", exception);
                }
                return false;
            };
            this._newGUID = function () {
                var s4 = function () {
                    return Math.floor((1 + Math.random()) * 65536).toString(16).substring(1);
                };
                return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
            };
            this._getDb = function (dbName) {
                if (dbName == null || dbName.length == 0) {
                    return null;
                }
                dbName = _this._formatDbName(dbName);
                return _this._dbs[dbName];
            };
            this._formatDbName = function (dbName) {
                if (dbName.indexOf(this.options.prefix + "_") == -1) {
                    dbName = this.options.prefix + "_" + dbName;
                }
                return dbName;
            };
            this._putDb = function (dbName, db) {
                if (dbName == null || dbName.length == 0) {
                    return false;
                }
                dbName = _this._formatDbName(dbName);
                _this._dbs[dbName] = db;
                return true;
            };
            /**
             * In order to create or update some views for a DB, a validation must be done using the "version" property
             * of the {@link LazyDesignViews#version}
             * @param db {object} database object.
             * @param callback {@link DbCreationCallback}
             * @private
             */
            this._validateDesignViews = function (db, callback) {
                if (!_this.options || !_this.options.views) {
                    return callback(null, DbCreateStatus.Created_Without_Views);
                }
                var designView = _this.options.views[db.name];
                if (!designView) {
                    return callback(null, DbCreateStatus.Created_Without_Views);
                }
                var evaluateView = function (error, result) {
                    var s = result ? DbCreateStatus.Created : DbCreateStatus.Error;
                    return callback(error, s);
                };
                db.get(LazyConst.DesignViews, function (error, document) {
                    if (error) {
                        if (error.reason) {
                            switch (error.reason) {
                                case LazyConst.View_Error_Missing:
                                    Log.d("LazyBoy", "_validateDesignViews", "Missing view");
                                    _this._saveViews(db, designView, evaluateView);
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
                            _this._saveViews(db, designView, evaluateView);
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
            this._saveViews = function (db, views, callback) {
                if (views) {
                    db.save(LazyConst.DesignViews, views, function (error, result) {
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
             * @param name {string} database name.
             * @param status {@link DbCreateStatus} status of the operation.
             * @private
             */
            this._continueCreate = function (name, status) {
                var success = DbCreateStatus.Created | DbCreateStatus.Created_Without_Views | DbCreateStatus.UpToDate;
                var fail = DbCreateStatus.Error | DbCreateStatus.Not_Connected;
                var r = { name: name, status: status };
                if (status & fail) {
                    _this._report.fail.push(r);
                }
                else if (status & success) {
                    _this._report.success.push(r);
                }
                if (_this._dbNames.length == 0) {
                    var error = _this._report.fail.length > 0 ? new LazyBoyError("Some db fails") : null;
                    _this._cOaC(error, _this._report);
                    _this._report.success = [];
                    _this._report.fail = [];
                    Log.i("LazyBoy", "InitializeDatabase", "_continueCreate", _this._report);
                    return;
                }
                var n = _this._dbNames.splice(0, 1);
                _this.InitializeDatabase(n[0], _this._continueCreate);
            };
            /**
             * Initialization of parameter and {options} object.
             * It will create default {options} object.
             * By default autoConnect it force to ensure use quickly.
             * @private
             */
            this._initParams = function () {
                _this._cOaC = function () {
                };
                if (!_this.options) {
                    _this.options = { host: "127.0.0.1", port: 5984, prefix: "lazy", autoConnect: true, views: {} };
                }
                if (_this.options.autoConnect !== false) {
                    _this.options.autoConnect = true;
                }
                if (!_this.host) {
                    if (!_this.options.host) {
                        _this.options.host = "127.0.0.1";
                    }
                    _this.host = _this.options.host;
                }
                if (!_this.port || isNaN(_this.port)) {
                    if (!_this.options.port || isNaN(_this.options.port)) {
                        _this.options.port = 5984;
                    }
                    _this.port = _this.options.port;
                }
                if (!_this.options.prefix) {
                    _this.options.prefix = "lazy";
                }
                else {
                    var p = _this.options.prefix.lastIndexOf("_");
                    var l = _this.options.prefix.length;
                    if (p === l - 1) {
                        _this.options.prefix = _this.options.prefix.substr(0, p);
                    }
                }
                // maybe adding https support ...
                _this._options = { cache: true, raw: false, forceSave: true };
                if (_this.options) {
                    _this.options.autoConnect ? _this.Connect() : false;
                }
            };
            if (options && options.logLevel) {
                Log = new LazyFormatLogger.Logger(options.logLevel);
            }
            this.options = options;
            this._initParams();
        }
        /**
         * Loading in memory all connections using the dbs names and the Cradle.Connection.
         */
        LazyBoy.prototype.Connect = function () {
            Log.d("LazyBoy", "Connect", "initiating connection using Cradle");
            this._connection = new Cradle.Connection(this.host, this.port, this._options);
            for (var _i = 0, _a = this._dbNames; _i < _a.length; _i++) {
                var name = _a[_i];
                Log.d("LazyBoy", "Connect", "initiating connection to db " + name);
                this._dbs[name] = this._connection.database(name);
            }
            return this;
        };
        /**
         *
         * @param names {Array} of strings representing the db name.
         * @return {lazyboyjs.LazyBoy}
         */
        LazyBoy.prototype.Databases = function () {
            var names = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                names[_i - 0] = arguments[_i];
            }
            for (var _a = 0, names_1 = names; _a < names_1.length; _a++) {
                var name = names_1[_a];
                this._injectDatabaseName(name);
            }
            return this;
        };
        /**
         * Using the database's name push through {@link LazyBoy#Databases} function
         * @param callback
         */
        LazyBoy.prototype.InitializeAllDatabases = function (callback) {
            this._cOaC = callback;
            var n = this._dbNames.splice(0, 1);
            this.InitializeDatabase(n[0], this._continueCreate);
        };
        /**
         * @param name {string}
         * @param callback {function}
         */
        LazyBoy.prototype.InitializeDatabase = function (name, callback) {
            var _this = this;
            if (!this._connection) {
                return callback(name, DbCreateStatus.Not_Connected);
            }
            name = this._formatDbName(name);
            Log.i("LazyBoy", "InitializeDatabase", "initializing database " + name);
            var db = this._getDb(name);
            if (!db) {
                db = this._connection.database(name);
                this._putDb(name, db);
            }
            db.exists(function (error, exist) {
                if (error) {
                    Log.e("LazyBoy", "InitializeDatabase", "db.exists", error);
                    return callback(name, DbCreateStatus.Error);
                }
                if (exist) {
                    Log.i("LazyBoy", "InitializeDatabase", "db exist " + name + "");
                    _this._validateDesignViews(db, function (error, status) {
                        var stat = error ? DbCreateStatus.Error : status;
                        return callback(name, stat);
                    });
                }
                else {
                    Log.i("LazyBoy", "InitializeDatabase", "creating " + name + "");
                    db.create(function (error) {
                        if (error) {
                            Log.i(error);
                            return callback(name, DbCreateStatus.Error);
                        }
                        _this._validateDesignViews(db, function (error, status) {
                            var stat = error ? DbCreateStatus.Error : status;
                            return callback(name, stat);
                        });
                    });
                }
            });
        };
        /**
         * For an easy manage of instance all object push to a 'lazy db' will be encapsulated inside an {@link LazyInstance}.
         * @param dbName {string}
         * @param entry {lazyboyjs.LazyInstance}
         * @param callback {lazyboyjs.InstanceCreateCallback}
         */
        LazyBoy.prototype.AddEntry = function (dbName, entry, callback) {
            var id = this._newGUID();
            if (entry.type) {
                id = entry.type + "_" + id;
            }
            var t = new Date().getTime();
            entry.created = t;
            entry.modified = t;
            var db = this._getDb(dbName);
            if (db) {
                db.save(id, entry, function (error, result) {
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
        };
        /**
         * Shorter to retrieve instance inside the database.
         * @param dbName {string} database name where to search.
         * @param entryId {string} CouchDB id of the instance to fetch.
         * @param callback {function(error: Error, instance: LazyInstance)}
         * @throw LazyBoyError
         */
        LazyBoy.prototype.GetEntry = function (dbName, entryId, callback) {
            var db = this._getDb(dbName);
            if (db) {
                db.get(entryId, function (error, document) {
                    if (error) {
                        return callback(error, null);
                    }
                    return callback(null, document);
                });
            }
            else {
                return callback(new LazyBoyError("database doesn't exist or not managed"), null);
            }
        };
        /**
         * Shorter to delete an entry from a specific database.
         * @param dbName {string} name of the database where to delete.
         * @param entry {LazyInstance} instance to delete.
         * @param callback {function(error: Error, delete:boolean)}
         * @param trueDelete {boolean} flag to force permanent delete
         */
        LazyBoy.prototype.DeleteEntry = function (dbName, entry, callback, trueDelete) {
            var _this = this;
            if (trueDelete) {
                var db = this._getDb(dbName);
                if (db) {
                    db.remove(entry._id, entry._rev, function (error, result) {
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
                this.GetEntry(dbName, entry._id, function (error, document) {
                    if (error) {
                        return callback(error, false);
                    }
                    else {
                        document.isDeleted = true;
                        _this.UpdateEntry(dbName, document, function (error, updated) {
                            return callback(error, updated);
                        });
                    }
                });
            }
        };
        /**
         * Shorter to update an entry in a specific databases.
         * @param dbName {string} name of the database where to update.
         * @param entry {LazyInstance} instance to update.
         * @param callback {function(error: Error, updated: boolean)}
         */
        LazyBoy.prototype.UpdateEntry = function (dbName, entry, callback) {
            var db = this._getDb(dbName);
            if (db) {
                db.save(entry._id, entry._rev, entry, function (error, result) {
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
        };
        /**
         * Shorter to access the result of a view calculation.
         * @param dbName {string} database name where the request should be executed.
         * @param viewName {string} view name initialize the request.
         * @param params {{key: string, group?: boolean, reduce?: boolean}} actual value to search inside the view.
         * @param callback {}
         */
        LazyBoy.prototype.GetViewResult = function (dbName, viewName, params, callback) {
            var db = this._getDb(dbName);
            if (db) {
                db.view("views/" + viewName, params, function (error, result) {
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
        };
        /**
         * Shorter to add a new {@link LazyView} to the {@link LazyDesignViews} associated with the database.
         * If no {@link LazyDesignViews} exist one will be created and push to the database. Otherwise the version
         * of the existing one will be incremented.
         * @param dbName {string}
         * @param viewName {string}
         * @param view {LazyView}
         * @param callback {function(error: Error, result: boolean)}
         */
        LazyBoy.prototype.AddView = function (dbName, viewName, view, callback) {
            var db = this._getDb(dbName);
            if (!db) {
                return callback(new LazyBoyError("database doesn't exist or not managed"), false);
            }
            var designView = this.options.views[this._formatDbName(dbName)];
            if (!designView) {
                designView = { version: 1, type: 'javascript', views: {} };
                designView.views[viewName] = view;
            }
            else {
                designView.version++;
                designView.views[viewName] = view;
            }
            this.options.views[this._formatDbName(dbName)] = designView;
            this._validateDesignViews(db, function (error, result) {
                Log.d("LazyBoy", "AddView", error, result);
                callback(null, result == DbCreateStatus.Created || result == DbCreateStatus.UpToDate);
            });
        };
        /**
         * Shorter to destroy all managed databases.
         * @param callback {function(error: Error, report: object}
         */
        LazyBoy.prototype.DropDatabases = function (callback) {
            var _this = this;
            var report = {
                dropped: ["name"],
                fail: ["name"]
            };
            report.dropped = [];
            report.fail = [];
            var _loop_1 = function(name_1) {
                if (this_1._dbs.hasOwnProperty(name_1)) {
                    var db_1 = this_1._dbs[name_1];
                    db_1.destroy(function (error) {
                        if (error) {
                            Log.e("LazyBoy", "DropDatabases", "db.destroy", error);
                            report.fail.push(db_1.name);
                            if (report.dropped.length + report.fail.length == Object.keys(_this._dbs).length) {
                                return callback(null, report);
                            }
                        }
                        else {
                            Log.d("LazyBoy", "DropDatabases", "db.destroy");
                            report.dropped.push(db_1.name);
                            if (report.dropped.length + report.fail.length == Object.keys(_this._dbs).length) {
                                return callback(null, report);
                            }
                        }
                    });
                }
            };
            var this_1 = this;
            for (var name_1 in this._dbs) {
                _loop_1(name_1);
            }
        };
        /**
         * Shorter to destroy a specific managed database.
         * @param dbName {string} name of the database to destroy.
         * @param callback {function(error: Error, report: object)}
         */
        LazyBoy.prototype.DropDatabase = function (dbName, callback) {
            var db = this._getDb(dbName);
            var dbArray = this._dbs;
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
        };
        /**
         * Helper to reset le logger level. {@see LazyFormatLogger}
         * @param level
         */
        LazyBoy.setLevel = function (level) {
            Log = new LazyFormatLogger.Logger(level);
        };
        LazyBoy.NewEntry = function (instance, type) {
            var entry = {
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
        return LazyBoy;
    }());
    lazyboyjs.LazyBoy = LazyBoy;
})(lazyboyjs = exports.lazyboyjs || (exports.lazyboyjs = {}));
