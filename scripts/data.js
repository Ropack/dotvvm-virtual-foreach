/// <reference types="knockout" />
function generateRows(count) {
    var rows = [];
    for (var i = 0; i < count; i++) {
        rows.push(getRow(i));
    }
    return rows;
}
function getRow(index) {
    return {
        Id: ko.observable(index),
        FirstName: ko.observable("First " + index),
        LastName: ko.observable("Last " + index)
    };
}
var testViewModel = {
    GridData: ko.observableArray(generateRows(500)),
    addNewRow: function () {
        var dataLength = this.GridData().length;
        this.GridData.push(getRow(dataLength));
    }
};
ko.applyBindings(testViewModel);
