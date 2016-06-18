export declare module lazyboyjs {
    interface LazyInstance {
        _id?: string;
        _rev?: string;
        created: number;
        modified: number;
        isDeleted: boolean;
        type: string;
        instance: any;
    }
    interface LazyView {
        map: any;
        reduce: any;
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
    enum DbDropStatus {
        Dropped = 3,
        Conflict = 6,
        Error = 12,
    }
    enum InstanceCreateStatus {
        Created = 5,
        Conflict = 10,
        Updated = 20,
        Error = 40,
    }
    interface DbInitializeAllCallback {
        (error: any, result: ReportInitialization): void;
    }
    interface DbCreationCallback {
        (error: any, result: DbCreateStatus): void;
    }
    interface InstanceCreateCallback {
        (error: any, result: InstanceCreateStatus, entry?: LazyInstance): void;
    }
    interface InstanceGetCallback {
        (error: any, result: LazyInstance): void;
    }
    interface DropCallback {
        (error: any, result: any): void;
    }
    class ReportError implements Error {
        name: string;
        message: string;
        constructor(message?: string);
    }
    interface ReportInitialization {
        success: Array<CreateReportEntry>;
        fail: Array<CreateReportEntry>;
    }
    class CreateReportEntry {
        name: string;
        status: DbCreateStatus;
    }
    class LazyConst {
        static DesignViews: string;
        static View_Error_Missing: string;
    }
    class LazyBoy {
        static NewEntry: (instance: any, type?: string) => LazyInstance;
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
        Connect(): this;
        /**
         *
         * @param names {Array} of strings representing the db name.
         * @return {lazyboyjs.LazyBoy}
         */
        Databases(...names: string[]): this;
        /**
         * Using the database's name push through {@link LazyBoy#Databases} function
         * @param callback
         */
        InitializeAllDatabases(callback: DbInitializeAllCallback): void;
        /**
         * @param name {string}
         * @param callback {function}
         */
        InitializeDatabase(name: string, callback: DbCreationCallback): void;
        /**
         * For an easy manage of instance all object push to a 'lazy db' will be encapsulated inside an {@link LazyInstance}.
         * @param dbName {string}
         * @param entry {lazyboyjs.LazyInstance}
         * @param callback {lazyboyjs.InstanceCreateCallback}
         */
        AddEntry(dbName: string, entry: LazyInstance, callback: InstanceCreateCallback): void;
        GetEntry(dbName: string, entryId: string, callback: InstanceGetCallback): void;
        DeleteEntry(dbName: string, entry: LazyInstance, callback: (error: any, deleted: boolean) => void, trueDelete: boolean): void;
        UpdateEntry(dbName: string, entry: LazyInstance, callback: (error: any, updated: boolean, data: LazyInstance) => void): void;
        /**
         * Shorter to access the result of a view calculation.
         * @param dbName {string} database name where the request should be executed.
         * @param viewName {string} view name initialize the request.
         * @param key {object} actual value to search inside the view.
         * @param callback {}
         */
        GetViewResult(dbName: string, viewName: string, key: any, callback: (error: any, result: any) => void): void;
        AddView(dbName: string, viewName: string, view: LazyView, callback: (error: any, result: boolean) => void): void;
        DropDatabases(callback: (error: any, report: any) => void): void;
        DropDatabase(dbName: string, callback: DropCallback): void;
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
