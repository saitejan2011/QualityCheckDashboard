import { ITableSchema } from "./ITableSchema";



export interface ITable {
    Name: string;
    Schema?: ITableSchema;
    Data?: any;
    IsActive: boolean;
    IsLoaded: boolean;
}   