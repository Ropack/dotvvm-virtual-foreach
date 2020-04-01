/// <reference types="knockout" />
function generateRows(count) {
    var rows = [];
    for (var i = 0; i < count; i++) {
        rows.push({
            Id: ko.observable(i),
            FirstName: ko.observable("First " + i),
            LastName: ko.observable("Last " + i)
        });
    }
    return rows;
}
var testViewModel = {
    GridData: ko.observableArray(generateRows(500))
};
ko.applyBindings(testViewModel);
