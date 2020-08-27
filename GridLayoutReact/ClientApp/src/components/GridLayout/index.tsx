import * as React from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-alpine.css';
// import 'ag-grid-community/dist/styles/ag-theme-fresh.css';
import './styles.scss';
import { Constants } from '../../Utility/Constants'
import { IState } from './IState';
import axios from 'axios';
import { parse } from 'path';
import { ColumnAnimationService } from 'ag-grid-community/dist/lib/rendering/columnAnimationService';
import { Column, ColDef, _ } from 'ag-grid-community';
import { ColumnDefinition } from '../../Models/ColumnDefinition';
import '../../Utility/gbStyles.scss';
import 'lodash';
import FormModal from '../FormModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCoffee, faPlus, faArchive, faSave } from '@fortawesome/free-solid-svg-icons'
import { Utilities } from './../../Utility/Util';
import { debug } from 'console';
import { ITable } from '../../Models/ITable';
import { IRowData } from '../../Models/RowData';
import { ITableSchema } from '../../Models/ITableSchema';





const util = new Utilities();




export default class GridLayout extends React.PureComponent<any, any> {
    public util = new Utilities();
    constructor(props: any) {
        super(props);
        this.state = {
            gridOptions: {
                api: {},
                columnApi: {},
                defaultColDef: {
                    flex: 1,
                    minWidth: 180,
                    resizable: true,
                    headerCheckboxSelection: this.isFirstColumn,
                    checkboxSelection: this.isFirstColumn,
                    sortable: true,
                    filter: true,
                    editable: true,
                    headerClass: "class-make",
                    //  newValueHandler: this.compareValues.bind(this),
                    cellClass: this.onCellHigh.bind(this)
                },
                columnDefs: [],
                rowData: null,
                enableSorting: true,
                pagination: true,
                paginationPageSize: 30,
                animateRows: true,
                rowSelection: "multiple",
                onGridReady: this.onGridReady.bind(this),
                onCellValueChanged: this.onCellValueChanged.bind(this),
                rowClassRules: {
                    'row-even': function (params: any) {
                        return params.node.rowIndex % 2 == 0;
                    },
                    'row-odd': function (params: any) {
                        return params.node.rowIndex % 2 != 0;
                    },
                },
            },
            data: {
                dbList: [],
                qualityCheckList: []
            },
            qualityCheckTables: [],
            identity: {
                Name: null
            }
        }
    }

    onCellHigh = (params: any) => {

        return (params.value === 'something' ? 'my-class-3' : 'my-class-3');
    }

    prepareCollDefs() {
        let varColDef: ColDef = {
            headerName: "test"
        };
        var objects = [{ 'a': 1 }, { 'b': 2 }];

        var deep = _.cloneObject(this.state);
        //console.log(deep[0] === objects[0]);
    }

    getTables = async () => {
        let tablesURL = Constants.hostURL + "/" + Constants.controller.dynamicData + "/" + Constants.actions.getTables;
        return new Promise<any>((resolve: (items: any) => void, reject: (error: any) => void): void => {
            this.util.getDataFromDB(tablesURL).then(async (tables: any) => {
                resolve(tables);
            });
        });
    }

    setTables = async (tables: any[]) => {
        let tableArr: ITable[] = [];
        return new Promise<any>(async (resolve: (items: any) => void, reject: (error: any) => void): Promise<void> => {
            tables.forEach((item: any, index: number) => {
                
                tableArr.push({
                    Name: item.name,
                    IsLoaded: false,
                    IsActive: index == 0
                });
            });
            await this.setState({ qualityCheckTables: tableArr }, () => {
                resolve(tableArr[0].Name);
            });
        });
    }



    getTableSchema = async (tblName: string) => {
        let tableSchemaURL = Constants.hostURL + "/" + Constants.controller.dynamicData + "/GetTableSchema?tableName=" + tblName;
        return new Promise<any>((resolve: (items: any) => void, reject: (error: any) => void): void => {
            this.util.getDataFromDB(tableSchemaURL).then((tblSchemaList: any) => {
                resolve(tblSchemaList);
            });
        });
    }

    getTableData = async (tblName: string) => {
        let tblDataUrl = "https://localhost:44372/api/DynamicData/GetTableData?tableName=" + tblName;
        return new Promise<any>((resolve: (items: any) => void, reject: (error: any) => void): void => {
            resolve(this.util.getDataFromDB(tblDataUrl));
        });
    }

    updateGridData = async (data: any, clnObj: any) => {
        let varResDataArr: any[] = [];
        return new Promise<any>((resolve: (items: any) => void, reject: (error: any) => void): void => {
            let identity = data[0].data.filter((item: any) => { return item.isIdentity == true })[0];
            debugger
            if (!identity) {
                alert("There is no Identity Column");
            }
            data.forEach((rowItem: any) => {
                let idenityObj = rowItem.data.filter((item: any) => { return item.isIdentity == true })[0];
                varResDataArr.push({
                    Identity: (idenityObj && idenityObj.value) ? idenityObj.value : null,
                    data: rowItem.data
                });
            });
            clnObj.data.qualityCheckList = varResDataArr;
            clnObj.data.dbList = data;
            clnObj.identity.Name = (identity && identity.columnName);

            let resCol = varResDataArr && varResDataArr[0].data.length > 0 && varResDataArr[0].data.map((colItem: any) => colItem.columnName);

            //Ag-Grid Data Config -- Start
            clnObj.gridOptions.rowData = this.setAgGridRowData(varResDataArr);
            //Ag-Grid Row Data Config -- End

            //Ag-Grid Col Data Config -- Start
            clnObj.gridOptions.columnDefs = this.setAgGridColData(resCol, varResDataArr);
            //Ag-Grid Col Data Config -- End
            resolve(clnObj);
        });


    }
    onGridUpdate = (tblName: string) => {
        let varQualityCheckTables = this.state.qualityCheckTables;
        let varQualityCheckTable = varQualityCheckTables.filter((s: any) => s.Name == tblName)[0];
        let clnQualityCheckObj = _.cloneObject(this.state);
        if (varQualityCheckTable && !(varQualityCheckTable.IsLoaded)) {
            this.getTableSchema(tblName).then(async (tblSchemaList: any) => {
                this.setTableSchema(tblName, tblSchemaList, clnQualityCheckObj).then((clnQualityCheckObj: any) => {
                    this.getTableData(tblName).then((tblData: any) => {
                        clnQualityCheckObj.qualityCheckTables.filter((s: any) => s.Name == tblName).map((ff: any) => { ff.Data = tblData; ff.IsLoaded = true; return ff; });
                        this.updateGridData(tblData, clnQualityCheckObj).then((clnObj: any) => {
                            clnObj.qualityCheckTables.map((item: any) => {
                                item.IsActive = (item.Name == tblName);
                                return item;
                            });
                            this.setState({ clnObj }, () => {
                                console.log("Success");
                            });
                        });
                    });
                });
            });
        }
        else {
            let tblData = varQualityCheckTable.Data;
            this.updateGridData(tblData, clnQualityCheckObj).then((clnObj: any) => {
                clnObj.qualityCheckTables.map((item: any) => {
                    item.IsActive = (item.Name == tblName);
                    return item;
                });
                this.setState({ clnObj }, () => {
                    console.log("Success");
                });
            });
        }
    }
    async componentDidMount() {


        let tables = await this.getTables();
        await this.setTables(tables).then((tblName: string) => {
            this.onGridUpdate(tblName);
        });




    }



    setTableSchema = (tblName: string, tblSchemaList: any[], clnQualityCheckObj: any) => {
        let tblSchemaArr: ITableSchema[] = [];
        return new Promise<any>((resolve: (items: any) => void, reject: (error: any) => void): void => {
            tblSchemaList.forEach((schemaItem: any) => {
                tblSchemaArr.push({
                    columnName: schemaItem.columnName,
                    dataType: schemaItem.columnName,
                    isIdentity: schemaItem.isIdentity,
                    isNullAble: schemaItem.isNull,
                    maximumLength: schemaItem.maximumLength,
                    tableName: schemaItem.tableName
                });
            });
            debugger;
            clnQualityCheckObj.qualityCheckTables.filter((s: any) => s.Name == tblName).map((ff: any) => {
                ff.Schema = tblSchemaArr;
                ff.IsLoaded = true;
                return ff;
            });
            resolve(clnQualityCheckObj);
        });
        //this.setState({ qualityCheckTables: varQualityCheckTables });
    }


    setAgGridRowData = (varResDataArr: any[]) => {
        let varRowDataArr: any[] = [];
        varResDataArr.forEach((cr_row: any) => {
            let obj = {};
            cr_row.data.forEach((cr_item: any) => {
                Object.defineProperty(obj, cr_item.columnName, {
                    value: cr_item.value,
                    writable: true,
                    enumerable: true,
                    configurable: true
                });
            });
            varRowDataArr.push(obj);
        });
        return varRowDataArr;
    }

    setAgGridColData = (resCol: any[], varResDataArr: any[]) => {
        let colArr: ColDef[] = [];
        resCol.forEach((key: any) => {
            colArr.push({
                headerName: util.capitalizeFLetter(key.trim()),
                field: key,
                hide: varResDataArr[0].data.filter((colItem: any) => colItem.columnName == key)[0].isIdentity == true
            });
        });
        return colArr;
    }

    onTableChange = (eve: any) => {
        let tblName: any = eve.target.value;
        debugger
        this.onGridUpdate(tblName);

    }

    getTableModel = (): any => {
        let qualityCheckTable = this.state.qualityCheckTables.filter((s: any) => s.IsActive == true)[0];
        let tblSchemaArr: ITableSchema[] = [];
        qualityCheckTable.Schema.forEach((schemaItem: any) => {
            tblSchemaArr.push({
                columnName: schemaItem.columnName,
                dataType: schemaItem.columnName,
                isIdentity: schemaItem.isIdentity,
                isNullAble: schemaItem.isNull,
                maximumLength: schemaItem.maximumLength,
                tableName: schemaItem.tableName,
                value: ""
            });
        });
        return { data: tblSchemaArr };
    }

    onNewItem = () => {
        debugger;
        let modelMetaData = this.getTableModel();
        let qualityCheckTable = this.state.qualityCheckTables.filter((s: any) => s.IsActive == true)[0];
        let varDataArr = modelMetaData;
        qualityCheckTable.Data.push(varDataArr);
        //this.setState({ ...qualityCheckTables, qualityCheckTable });

        //this.setState({ someProperty: { ...this.state.someProperty, flag: false } });


    }


    public render() {   
        return (
            <div className="gridLayoutContainer">
                <div className="row mb-1">
                    <div className="col-md-6 form-group">
                        <div className="input-group">
                            <div className="input-group-prepend">
                                <span className="input-group-text" >Tables</span>
                            </div>
                            <select className=" form-control col-md-6" placeholder="Select Table" onChange={this.onTableChange}>
                                {this.state.qualityCheckTables.map((tableItem: any) => {
                                    return (<option value={tableItem.Name}> {tableItem.Name}</option>);
                                })}
                            </select>
                        </div>
                    </div>
                    <div className="col-md-6 form-group search-txtbox-container ext-right">
                        <div className="input-group col-md-6 px-0">
                            <input type="text" onInput={this.onQuickFilterChanged} className="form-control" placeholder="Search..." aria-label="Recipient's username" aria-describedby="basic-addon2" />
                            <div className="input-group-append d-block">
                                <span className="input-group-text" >Search</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row mb-2">
                    <div className="col-md-6 px-0">
                        <div className="d-inline-block col-md-2">

                            <button className="btn btn-primary btn-action col" data-toggle="modal" data-target="#fullHeightModalRight"><FontAwesomeIcon icon={faPlus} /> New</button>
                        </div>
                        <div className="d-inline-block col-md-2">
                            <button className="btn btn-primary btn-action col" onClick={this.onNewItem} >
                                <FontAwesomeIcon icon={faPlus} /> New Item</button>
                        </div>
                        <div className="d-inline-block col-md-2">
                            <button className="btn btn-primary btn-action col"><FontAwesomeIcon icon={faArchive} /> Delete</button>
                        </div>
                    </div>
                    <div className="col-md-6 px-0 ext-right">
                        <div className="d-inline-block col-md-2">
                            <button className="btn btn-primary btn-action col"><FontAwesomeIcon icon={faSave} /> Save</button>
                        </div>
                    </div>
                </div>

                <div className="ag-theme-alpine gridLayoutInnerContainer">
                    <AgGridReact
                        columnDefs={this.state.gridOptions.columnDefs}
                        rowData={this.state.gridOptions.rowData}
                        gridOptions={this.state.gridOptions}
                    >
                    </AgGridReact>
                </div>
                <FormModal  ></FormModal>
            </div>
        );
    }

    getRowStyle(params: any) {
        if (params.node.rowIndex % 2 === 0) {
            return 'my-shaded-effect';
        }
    }

    private test = () => {
        let table: any[] = this.state.gridOptions.rowData;
        let obj: any = {};
        let keys = Object.keys(this.state.gridOptions.rowData[0]);
        let mainObj = {};
        table.forEach(element => {
            let ss = [];
            keys.forEach(ele => {


                ss.push(Object.defineProperties({}, {
                    [ele]: {
                        value: 42
                    },
                    dataType: {
                        value: "string"
                    }
                }));


            });



        });

    }

    checkState = () => {

        let ss = this.state;
    }

    private onBtAdd = () => {
        let table = this.state.gridOptions.rowData;

        table.unshift({
            "athlete": "Enter New Item",
            "age": null,
            "date": null,
            "country": null,
            "year": null,
            "sport": null,
            "gold": null,
            "silve": 2,
            "asd": "Supper",
            "bronze": null,
            "Total": null
        });
        this.state.gridOptions.api.setRowData(table);
    };

    onCellValueChanged = (eve: any) => {
        debugger
        let ss = this.state;
    }



    onGridReady(eve: any) {
        console.log('Sai Teja' + eve);
        this.state.gridOptions.api = eve.api;
        this.state.gridOptions.columnApi = eve.columnApi;
        //  this.state.gridOptions.api.selectAll();
        this.setState({ gridOptions: this.state.gridOptions });
    }


    onQuickFilterChanged = (eve: any) => {
        const { value } = eve.target;
        this.state.gridOptions.api.setQuickFilter(value);
    };

    isFirstColumn(params: any) {
        var displayedColumns = params.columnApi.getAllDisplayedColumns();
        var thisIsFirstColumn = displayedColumns[0] === params.column;
        return thisIsFirstColumn;
    }

    compareValues(params: any) {

        if (params.oldValue.toString() > params.newValue.toString()) {
            return { headerClass: "class-make" }
        }
        if (params.oldValue.toString() < params.newValue.toString()) {
            return { color: 'red', backgroundColor: 'black' };
        }
    }
};


