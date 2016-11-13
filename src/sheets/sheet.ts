
import * as config from 'config';
import * as _ from 'lodash';
import * as moment from 'moment-timezone';
import { GoogleSheets } from '../google-sheets';

export interface IColumnDescriptions {
    [columnName: string]: {
        title?: string, // Title identifier: can be a substring of actual title.
        rowLetter?: string,
        rangeIndex?: number,
        transform?: (string) => any
    }
}

export interface ISheetConfig<T> {
    api?: GoogleSheets,
    sheetId?: string,
    name?: string,
    columns?: IColumnDescriptions,
    data?: T[],
    indexedData?: { [value: string]: T }
}

export class Sheet<T> {
    protected static headings: IColumnDescriptions = {};
    protected static keyBy = null;
    protected static range = 'A1:B';
    protected static columnLetters: string[] = null;

    public static create<S>(config: ISheetConfig<S>): Promise<Sheet<S>> {
        this.makeColumnLetters();

        let range = `${config.name}!${this.range}`;
        return config.api.getSheetRange(config.sheetId, range)
            .then(result => {
                let newConfig = Object.assign({}, config);

                newConfig.columns = this.getColumns(result);
                newConfig.data = this.getData(newConfig.columns, result);
                newConfig.indexedData = this.indexData(newConfig.data);

                let sheet = new this<S>(newConfig);

                return Promise.resolve(sheet);
            });
    }

    private static makeColumnLetters() {
        if (!this.columnLetters) {
            let a = this.range.charCodeAt(0);
            let b = this.range.charCodeAt(3);
            this.columnLetters = _.chain(a)
                .range(b + 1)
                .map(i => String.fromCharCode(i))
                .value();
        }
    }

    private static getColumns(result) {
        let actualHeadings = result.values[0];
        let pairs = _.zip(actualHeadings, this.columnLetters);
        let columns = Object.assign({}, this.headings);
        _.each(columns, column => {
            let index = _.findIndex(pairs, pair => pair[0].indexOf(column.title) !== -1);
            if (index !== -1) {
                let pair = pairs[index];
                column['rowLetter'] = pair[1];
                column['rangeIndex'] = index;
            }
        });
        return columns;
    }

    private static getData<S>(columns: IColumnDescriptions, result): S[] {
        return _.map(result.values.slice(1), rowData => {
            return <S> _.mapValues(columns, (c, name) => {
                let data = rowData[c.rangeIndex];
                if (!data && Sheet.doTransformOnNull.indexOf(c.transform) === -1) return null;
                if (c.transform) return c.transform(data);
                return data;
            });
        });
    }

    protected static indexData<S>(data: S[]): { [indexValue: string]: S }  {
        if (this.keyBy) {
            return _.keyBy(data, this.keyBy);
        }
        return null;
    }

    // Data Transformations:

    public static dateTx = d => {
        return moment.tz(d, 'MM/DD/YYYY', config.get<string>('timezone'))
            .hours(23)
            .minutes(59)
            .seconds(59)
            .toDate();
    };
    public static listTx = d => d.split(/[,\s]+/g);
    public static durationTx = d => {
        let split = d.split(/\s+/g);
        return moment.duration(parseFloat(split[0]), split[1]).asMinutes()
    };
    public static booleanTx = d => !!d;
    public static intTx = d => parseInt(d);

    private static doTransformOnNull = [
        Sheet.booleanTx
    ];

    protected constructor(
        protected config: ISheetConfig<T>
    ) {}
}