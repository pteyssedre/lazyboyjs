/// <reference path="../typings/index.d.ts" />
export declare module lazyboyjs {
    interface LazyInstance {
        created: number;
        modified: number;
        type: string;
        instance: any;
    }
    interface LazyView {
        map(doc: any): any;
        reduce(doc: any): any;
    }
    interface LazyDesignViews {
        version: number;
        type: string;
        views: {
            [id: string]: LazyView;
        };
    }
    interface LazyOptions {
        host?: string;
        port?: number;
        prefix?: string;
        views?: {
            [id: string]: LazyDesignViews;
        };
        autoConnect?: boolean;
    }
    enum DbCreateStatus {
        Created = 1,
        UpToDate = 2,
        UpdateNeeded = 4,
        Created_Without_Views = 8,
        Not_Connected = 16,
        Error = 32,
    }
    interface DbCreationCallback {
        (error: any, result: DbCreateStatus): void;
    }
    interface CreateCallback {
        (error: any, result: any): void;
    }
    class ReportError implements Error {
        name: string;
        message: string;
        constructor(message?: string);
    }
    class LazyConst {
        static DesignViews: string;
        static View_Error_Missing: string;
    }
    class LazyBoy {
        host: string;
        port: number;
        hasConnection: () => boolean;
        options: LazyOptions;
        private _connection;
        private _options;
        private _dbNames;
        private _dbs;
        private _cOaC;
        private _report;
        constructor(options?: LazyOptions);
        /**
         * Loading in memory all connections using the dbs names and the Cradle.Connection.
         */
        Connect(): void;
        /**
         *
         * @param names {Array} of strings representing the db name.
         * @return {lazyboyjs.LazyBoy}
         */
        Databases(names: string[]): this;
        /**
         * TODO: Create report Interface to export result of creation.
         * @param callback
         */
        InitializeAllDatabases(callback: DbCreationCallback): void;
        /**
         * @param name {string}
         * @param callback {function}
         */
        InitializeDatabase(name: string, callback: DbCreationCallback): void;
        /**
         *
         * @param dbName
         * @param instance
         * @param callback
         */
        AddInstance(dbName: string, instance: LazyInstance, callback: CreateCallback): void;
        GetViewResult(dbName: string, viewName: string, key: any, value: string, callback: (error: any, result: any) => void): void;
        private _injectDatabaseName;
        private _newGUID;
        private _getDb;
        private _formatDbName;
        private _putDb;
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
         * @param name {string} database name.
         * @param status {@link DbCreateStatus} status of the operation.
         * @private
         */
        private _continueCreate;
        /**
         * Initialization of parameter and {options} object.
         * It will create default {options} object.
         * By default autoConnect it force to ensure use quickly.
         * @private
         */
        private _initParams;
    }
}
