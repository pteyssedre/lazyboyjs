import * as Cradle from "cradle";
import LazyFormatLogger = require("lazy-format-logger");
export declare module lazyboyjs {
    function setLevel(level: LazyFormatLogger.LogLevel): void;
    function newEntry(instance: any, type?: string): LazyInstance;
    /**
     * Definition of {@link LazyInstance} object.
     * Those are the minimal required fields for an instance to be valid.
     */
    interface LazyInstance {
        _id?: string;
        _rev?: string;
        created: number;
        modified: number;
        isDeleted: boolean;
        type: string;
        instance: any;
        _attachments?: {
            [id: string]: CouchAttachment;
        };
    }
    interface CouchAttachment {
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
    interface LazyView {
        map: any;
        reduce?: any;
    }
    /**
     * Definition of {@link LazyDesignViews} object.
     * Those are the minimal required fields for an instance to be valid.
     */
    interface LazyDesignViews {
        version: number;
        type: string;
        views: {
            [id: string]: LazyView;
        };
    }
    /**
     * Definition of {@link LazyOptions} object.
     * Those are the minimal required fields for an instance to be valid.
     */
    interface LazyOptions {
        host?: string;
        port?: number;
        prefix?: string;
        views?: {
            [id: string]: LazyDesignViews;
        };
        autoConnect?: boolean;
        logLevel?: LazyFormatLogger.LogLevel;
    }
    interface LazyViewParams {
        key?: string;
        keys?: string[];
        startkey?: string;
        endkey?: string;
        limit?: number;
        descending?: boolean;
        include_docs?: boolean;
        group?: boolean;
        reduce?: boolean;
    }
    /**
     * Enumeration of status for Database creation
     */
    enum DbCreateStatus {
        Created = 1,
        UpToDate = 2,
        UpdateNeeded = 4,
        Created_Without_Views = 8,
        Not_Connected = 16,
        Error = 32,
    }
    /**
     * Enumeration of status for Database drop
     */
    enum DbDropStatus {
        Dropped = 3,
        Conflict = 6,
        Error = 12,
    }
    /**
     * Enumeration of status for Entry creation
     */
    enum InstanceCreateStatus {
        Created = 5,
        Conflict = 10,
        Updated = 20,
        Error = 40,
    }
    /**
     * Definition of the callback function when {@link LazyBoy.InitializeAllDatabases} method is invoked.
     */
    interface DbInitializeAllCallback {
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
    interface DbCreationCallback {
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
    interface InstanceCreateCallback {
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
    interface InstanceGetCallback {
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
    interface DropCallback {
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
    class LazyBoyError implements Error {
        name: string;
        message: string;
        constructor(message?: string);
    }
    interface ReportInitialization {
        success: Array<CreateReportEntry>;
        fail: Array<CreateReportEntry>;
    }
    /**
     * Definition of the report produce each time {@link LazyBoy.InitializeAllDatabases} method is invoked.
     */
    interface CreateReportEntry {
        name: string;
        status: DbCreateStatus;
    }
    class LazyConst {
        static DesignViews: string;
        static View_Error_Missing: string;
        static View_Error_Deleted: string;
    }
    class LazyBase {
        /**
         *
         * @param instance {Object}
         * @param type {string}
         * @returns {LazyInstance}
         */
        static NewEntry: (instance: any, type?: string) => LazyInstance;
        host: string;
        port: number;
        options: LazyOptions;
        protected _connection: Cradle.Connection;
        protected _options: Cradle.Options;
        protected _dbNames: string[];
        protected _dbs: {
            [id: string]: Cradle.Database;
        };
        constructor(options?: LazyOptions);
        /**
         * Initialization of parameter and {options} object.
         * It will create default {options} object.
         * By default autoConnect it force to ensure use quickly.
         * @private
         */
        private _initParams;
        /**
         *
         * @param name {string}
         * @returns {boolean}
         * @private
         */
        protected _injectDatabaseName: (name: string) => boolean;
        /**
         *
         * @returns {string}
         * @private
         */
        protected _newGUID: () => string;
        /**
         *
         * @param dbName
         * @returns {Object}
         * @private
         */
        protected _getDb: (dbName: string) => Cradle.Database;
        /**
         *
         * @param dbName
         * @returns {string}
         * @private
         */
        protected _formatDbName: (dbName: string) => string;
        /**
         *
         * @param dbName {string}
         * @param db {object}
         * @returns {boolean}
         * @private
         */
        protected _putDb: (dbName: string, db: Cradle.Database) => boolean;
    }
    class LazyBoy extends LazyBase {
        hasConnection: () => boolean;
        private _cOaC;
        private _report;
        constructor(options?: LazyOptions);
        /**
         * Loading in memory all connections using the dbs names and the Cradle.Connection.
         * @return {LazyBoy}
         */
        Connect(): this;
        /**
         *
         * @param names {Array} of strings representing the db name.
         * @return {LazyBoy}
         */
        Databases(...names: string[]): this;
        /**
         * Using the database's name push through {@link LazyBoy#Databases} function
         * @param callback {DbCreationCallback}
         */
        InitializeAllDatabases(callback: DbInitializeAllCallback): void;
        /**
         * @param name {string}
         * @param callback {DbCreationCallback}
         */
        InitializeDatabase(name: string, callback: DbCreationCallback): void;
        /**
         * For an easy manage of instance all object push to a 'lazy db' will be encapsulated inside an {@link LazyInstance}.
         * @param dbName {string}
         * @param entry {lazyboyjs.LazyInstance}
         * @param callback {lazyboyjs.InstanceCreateCallback}
         */
        AddEntry(dbName: string, entry: LazyInstance, callback: InstanceCreateCallback): void;
        /**
         * Shorter to retrieve instance inside the database.
         * @param dbName {string} database name where to search.
         * @param entryId {string} CouchDB id of the instance to fetch.
         * @param callback {function(error: Error, instance: LazyInstance)}
         * @throw LazyBoyError
         */
        GetEntry(dbName: string, entryId: string, callback: InstanceGetCallback): void;
        /**
         * Shorter to delete an entry from a specific database.
         * @param dbName {string} name of the database where to delete.
         * @param entry {LazyInstance} instance to delete.
         * @param callback {function(error: Error, delete:boolean)}
         * @param trueDelete {boolean} flag to force permanent delete
         */
        DeleteEntry(dbName: string, entry: LazyInstance, callback: (error: any, deleted: boolean) => void, trueDelete: boolean): void;
        /**
         * Shorter to update an entry in a specific databases.
         * @param dbName {string} name of the database where to update.
         * @param entry {LazyInstance} instance to update.
         * @param callback {function(error: Error, updated: boolean)}
         */
        UpdateEntry(dbName: string, entry: LazyInstance, callback: (error: any, updated: boolean, data: LazyInstance) => void): void;
        /**
         * Shorter to access the result of a view calculation.
         * @param dbName {string} database name where the request should be executed.
         * @param viewName {string} view name initialize the request.
         * @param params {lazyboyjs.LazyViewParams} actual value to search inside the view.
         * @param callback {}
         */
        GetViewResult(dbName: string, viewName: string, params: LazyViewParams, callback: (error: any, result: any) => void): void;
        /**
         * Shorter to add a new {@link LazyView} to the {@link LazyDesignViews} associated with the database.
         * If no {@link LazyDesignViews} exist one will be created and push to the database. Otherwise the version
         * of the existing one will be incremented.
         * @param dbName {string}
         * @param viewName {string}
         * @param view {LazyView}
         * @param callback {function(error: Error, result: boolean)}
         */
        AddView(dbName: string, viewName: string, view: LazyView, callback: (error: any, result: boolean) => void): void;
        /**
         * Shorter to destroy all managed databases.
         * @param callback {function(error: Error, report: object}
         */
        DropDatabases(callback: (error: any, report: any) => void): void;
        /**
         * Shorter to destroy a specific managed database.
         * @param dbName {string} name of the database to destroy.
         * @param callback {function(error: Error, report: object)}
         */
        DropDatabase(dbName: string, callback: DropCallback): void;
        /**
         * In order to create or update some views for a DB, a validation must be done using the "version" property
         * of the {@link LazyDesignViews#version}
         * @param db {object} database object.
         * @param callback {@link DbCreationCallback}
         * @private
         */
        private _validateDesignViews;
        /**
         * Shorter to save and validate the {views} of a specific database.
         * @param db {object}
         * @param views {LazyDesignViews}
         * @param callback {function}
         * @private
         */
        private _saveViews;
        /**
         * Callback use when {InitializeAllDatabases} is called. It will
         * continue the creation of all databases contain in {_dbNames}.
         * @param error {Error} error.
         * @param name {string} database name.
         * @param status {@link DbCreateStatus} status of the operation.
         * @private
         */
        private _continueCreate;
    }
    class LazyBoyAsync extends LazyBase {
        hasConnection: () => boolean;
        constructor(options?: LazyOptions);
        /**
         * Loading in memory all connections using the dbs names and the Cradle.Connection.
         * @return {Promise<boolean>}
         */
        ConnectAsync(): Promise<boolean>;
        /**
         * Shorter to add databases to
         * @param names {Array} of strings representing the db name.
         * @return {LazyBoy}
         */
        Databases(...names: string[]): this;
        /**
         * Using the database's name push through {@link LazyBoy#Databases} function
         * @return {Promise<ReportInitialization>}
         */
        InitializeAllDatabasesAsync(): Promise<ReportInitialization>;
        /**
         * @param name {string}
         * @return {Promise<{status: DbCreateStatus, name: string}>}
         */
        InitializeDatabaseAsync(name: string): Promise<{
            status: DbCreateStatus;
            name: string;
        }>;
        /**
         * For an easy manage of instance all object push to a 'lazy db' will be encapsulated inside an {@link LazyInstance}.
         * @param dbName {string} database name where to insert data.
         * @param data {object}
         * @return {Promise<{error: Error, result: InstanceCreateStatus, entry?: LazyInstance}>}
         */
        AddEntryAsync(dbName: string, data: {
            type?: string;
            data: Object;
        }): Promise<{
            error: Error;
            result: InstanceCreateStatus;
            entry?: LazyInstance;
        }>;
        /**
         * Shorter to retrieve instance inside the database.
         * @param dbName {string} database name where to search.
         * @param entryId {string} CouchDB id of the instance to fetch.
         * @return {Promise<{error: Error, data: LazyInstance}>}
         */
        GetEntryAsync(dbName: string, entryId: string): Promise<{
            error: any;
            data: LazyInstance;
        }>;
        /**
         * Shorter to delete an entry from a specific database.
         * @param dbName {string} name of the database where to delete.
         * @param entry {LazyInstance} instance to delete.
         * @param trueDelete {boolean} flag to force permanent delete, with default value to false
         * @return {Promise<{error: Error, deleted: boolean}>}
         */
        DeleteEntryAsync(dbName: string, entry: LazyInstance, trueDelete?: boolean): Promise<{
            error: Error;
            deleted: boolean;
        }>;
        /**
         * Shorter to update an entry in a specific databases.
         * @param dbName {string} name of the database where to update.
         * @param entry {LazyInstance} instance to update.
         * @return {Promise<{error: Error, updated: boolean, data: LazyInstance}>}
         */
        UpdateEntryAsync(dbName: string, entry: LazyInstance): Promise<{
            error: Error;
            updated: boolean;
            data: LazyInstance;
        }>;
        /**
         * Shorter to access the result of a view calculation.
         * @param dbName {string} database name where the request should be executed.
         * @param viewName {string} view name initialize the request.
         * @param params {lazyboyjs.LazyViewParams} actual value to search inside the view.
         * @return {Promise<{error: Error, result: any}>}
         */
        GetViewResultAsync(dbName: string, viewName: string, params: LazyViewParams): Promise<{
            error: Error;
            result: any;
        }>;
        /**
         * Shorter to add a new {@link LazyView} to the {@link LazyDesignViews} associated with the database.
         * If no {@link LazyDesignViews} exist one will be created and push to the database. Otherwise the version
         * of the existing one will be incremented.
         * @param dbName {string}
         * @param viewName {string}
         * @param view {LazyView}
         * @return {Promise<{error: Error, result: boolean}>}
         */
        AddViewAsync(dbName: string, viewName: string, view: LazyView): Promise<{
            error: Error;
            result: boolean;
        }>;
        /**
         *
         * @param dbName {string} database name where to push the desing view.
         * @param views {Object}
         * @return {Promise<{error: Error, result: boolean}>}
         * @constructor
         */
        AddViewsAsync(dbName: string, views: {
            name: string;
            view: LazyView;
        }[]): Promise<{
            error: Error;
            result: boolean;
        }>;
        /**
         * Shorter to destroy all managed databases.
         * @return {Promise<{success: string[], fail: string[]}>}
         */
        DropAllDatabasesAsync(): Promise<{
            success: string[];
            fail: string[];
        }>;
        /**
         * Shorter to destroy a specific managed database.
         * @param dbName {string} name of the database to destroy.
         * @return {Promise<{error: Error, status: DbDropStatus}>}
         */
        DropDatabaseAsync(dbName: string): Promise<{
            error: Error;
            status: DbDropStatus;
        }>;
        AddAttachment(dbName: string, entryId: string, rev: string, data: any): Promise<{
            error: any;
            status: any;
        }>;
        AddFileAsAttachmentAsync(dbName: string, entryId: string, rev: string, name: string, path: string): Promise<{
            error: any;
            status: any;
        }>;
        GetAttachmentAsync(dbName: string, entryId: string, attachmentName: string): Promise<any>;
        GetAttachmentInfoAsync(dbName: string, entryId: string, attachmentName: string): Promise<CouchAttachment>;
        /**
         *
         * @param dbName
         * @param viewName
         * @param view
         * @private
         */
        private _updateView(dbName, viewName, view);
        /**
         *
         * @param name
         * @return {object}
         * @private
         */
        private _getAndConnectDb(name);
        /**
         * In order to create or update some views for a DB, a validation must be done using the "version" property
         * of the {@link LazyDesignViews#version}
         * @param db {object} database object.
         * @return {Promise<{error: Error, status: DbCreateStatus}>}
         * @private
         */
        private _validateDesignViewsAsync(db);
        _getDesignViewsAsync(db: Cradle.Database): Promise<{
            error: Error;
            result: any;
        }>;
        /**
         * Shorter to save and validate the {views} of a specific database.
         * @param db {object}
         * @param views {LazyDesignViews}
         * @return {Promise<{error: Error, result: boolean}>}
         * @private
         */
        private _saveViewsAsync(db, views);
    }
}
