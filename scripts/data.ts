/// <reference types="knockout" />

function generateRows(count: number) {
    const rows = [];

    for (let i = 0; i < count; i++) {
        rows.push(getRow(i));
    }

    return rows;
}

function getRow(index: number): any {
    return { 
        Id: ko.observable(index), 
        FirstName: ko.observable("First "+ index), 
        LastName: ko.observable("Last "+ index)}
}

var testViewModel = {
    GridData: ko.observableArray(generateRows(500)),
    addNewRow():void {
        let dataLength = this.GridData().length;
        this.GridData.push(getRow(dataLength));
    }
};

ko.applyBindings(testViewModel);