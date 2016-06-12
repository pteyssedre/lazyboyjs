/// <reference path="../typings/index.d.ts" />
"use strict";
var Cradle = require("cradle");
var lazyboyjs;
(function (lazyboyjs) {
    (function (DbCreateStatus) {
        DbCreateStatus[DbCreateStatus["Created"] = 1] = "Created";
        DbCreateStatus[DbCreateStatus["UpToDate"] = 2] = "UpToDate";
        DbCreateStatus[DbCreateStatus["UpdateNeeded"] = 4] = "UpdateNeeded";
        DbCreateStatus[DbCreateStatus["Created_Without_Views"] = 8] = "Created_Without_Views";
        DbCreateStatus[DbCreateStatus["Not_Connected"] = 16] = "Not_Connected";
        DbCreateStatus[DbCreateStatus["Error"] = 32] = "Error";
    })(lazyboyjs.DbCreateStatus || (lazyboyjs.DbCreateStatus = {}));
    var DbCreateStatus = lazyboyjs.DbCreateStatus;
    var ReportError = (function () {
        function ReportError(message) {
            this.name = "ReportError";
            this.message = message;
        }
        return ReportError;
    }());
    lazyboyjs.ReportError = ReportError;
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
            this._cOaC = function () {
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
                    console.log(exception);
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
                if (_this.options && _this.options.views) {
                    var designView_1 = _this.options.views[db.name];
                    if (designView_1) {
                        db.get(LazyConst.DesignViews, function (error, document) {
                            if (error) {
                                if (error.reason) {
                                    switch (error.reason) {
                                        case LazyConst.View_Error_Missing:
                                            _this._saveViews(db, designView_1, function (error, result) {
                                                var s = result ? DbCreateStatus.Created : DbCreateStatus.Created_Without_Views;
                                                return callback(error, s);
                                            });
                                            break;
                                        default:
                                            return callback(error, DbCreateStatus.Error);
                                    }
                                }
                                else {
                                    return callback(error, DbCreateStatus.Error);
                                }
                            }
                            else if (document) {
                                console.log("new document", document);
                            }
                            else {
                                return callback(null, DbCreateStatus.Created_Without_Views);
                            }
                        });
                    }
                }
                else {
                    return callback(null, DbCreateStatus.Created_Without_Views);
                }
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
                            console.error(error);
                            return callback(error, false);
                        }
                        //TODO: validate result object
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
                var success = DbCreateStatus.Created | DbCreateStatus.Created_Without_Views;
                var fail = DbCreateStatus.Error | DbCreateStatus.Not_Connected;
                var r = { name: name, status: status };
                if (status & fail) {
                    _this._report.fail.push(r);
                }
                else if (status & success) {
                    _this._report.success.push(r);
                }
                if (_this._dbNames.length == 0) {
                    var error = _this._report.fail.length > 0 ? new ReportError("Some db fails") : null;
                    _this._cOaC(error, _this._report);
                    _this._report.success = [];
                    _this._report.fail = [];
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
                    _this.options = { host: "127.0.0.1", port: 5984, prefix: "lazy", autoConnect: true };
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
            this.options = options;
            this._initParams();
        }
        /**
         * Loading in memory all connections using the dbs names and the Cradle.Connection.
         */
        LazyBoy.prototype.Connect = function () {
            this._connection = new Cradle.Connection(this.host, this.port, this._options);
            for (var _i = 0, _a = this._dbNames; _i < _a.length; _i++) {
                var name = _a[_i];
                this._dbs[name] = this._connection.database(name);
            }
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
            var db = this._getDb(name);
            if (!db) {
                db = this._connection.database(name);
                this._putDb(name, db);
            }
            db.exists(function (error, exist) {
                if (error) {
                    return callback(name, DbCreateStatus.Error);
                }
                if (exist) {
                    _this._validateDesignViews(db, function (error, status) {
                        var stat = error ? DbCreateStatus.Error : status;
                        return callback(name, stat);
                    });
                }
                else {
                    db.create(function (error) {
                        if (error) {
                            console.log(error);
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
         *
         * @param dbName
         * @param instance
         * @param callback
         */
        LazyBoy.prototype.AddInstance = function (dbName, instance, callback) {
            var id = this._newGUID();
            if (instance.type) {
                id = instance.type + "_" + id;
            }
            var t = new Date().getTime();
            instance.created = t;
            instance.modified = t;
            var db = this._getDb(dbName);
            if (db) {
                db.save(id, instance, function (error, result) {
                    if (error) {
                        console.error(error);
                        return callback(error, null);
                    }
                    return callback(null, result);
                });
            }
            else {
                return callback(new ReportError("database doesn't exist or not managed"), null);
            }
        };
        ;
        LazyBoy.prototype.GetViewResult = function (dbName, viewName, key, value, callback) {
            var db = this._getDb(dbName);
            if (db) {
                db.view("views/" + viewName, { key: key }, function (error, result) {
                    if (error) {
                        console.error("ERROR", new Date(), error);
                        return callback(error, result);
                    }
                    return callback(error, result);
                });
            }
            else {
                return callback(new ReportError("database doesn't exist or not managed"), null);
            }
        };
        return LazyBoy;
    }());
    lazyboyjs.LazyBoy = LazyBoy;
})(lazyboyjs = exports.lazyboyjs || (exports.lazyboyjs = {}));
