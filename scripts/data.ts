/// <reference types="knockout" />

function generateRows(count: number) {
    const rows = [];

    for (let i = 0; i < count; i++) {
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