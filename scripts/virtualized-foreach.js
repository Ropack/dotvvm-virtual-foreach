(function () {
    ko.bindingHandlers["virtualized-foreach"] = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            return ko.bindingHandlers['foreach']['init'](element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var array = ko.unwrap(valueAccessor());
            // get parameters
            var rowHeight = allBindingsAccessor.get("virtualized-foreach-row-height") || 0;
            var columnWidth = allBindingsAccessor.get("virtualized-foreach-column-width") || 0;
            var orientation = allBindingsAccessor.get("virtualized-foreach-orientation") || 'vertical';
            // get scroll values and handle scroll changes
            var scrollTop = ko.observable(element.parentElement.scrollTop);
            var scrollLeft = ko.observable(element.parentElement.scrollLeft);
            var scrollHandler = element.parentElement['dotvvmVirtualForeachScroll'];
            if (scrollHandler) {
                element.parentElement.removeEventListener("scroll", scrollHandler);
            }
            scrollHandler = function () {
                scrollTop(element.parentElement.scrollTop);
                console.log(scrollTop());
                scrollLeft(element.parentElement.scrollLeft);
                console.log(scrollLeft());
                console.log(element.parentElement.clientHeight);
            };
            element.parentElement.addEventListener("scroll", scrollHandler);
            element.parentElement['dotvvmVirtualForeachScroll'] = scrollHandler;
            // get size of element visible on display
            console.log("u" + element.parentElement.clientHeight);
            var visibleHeight = ko.observable(element.parentElement.clientHeight);
            var visibleWidth = ko.observable(element.parentElement.clientWidth);
            // create sub array and calculate paddings
            var visibleArray = ko.computed(function () { return getVisibleSubArray(element, scrollTop, scrollLeft, rowHeight, columnWidth, visibleHeight, visibleWidth, array, orientation); });
            // alert("update");
            // create foreach binding with only subarray items
            var foreachResult = ko.bindingHandlers['foreach']['update'](element, function () { return visibleArray; }, allBindingsAccessor, viewModel, bindingContext);
            // update size of element visible on display (before foreach binding creatating it was 0)
            console.log("a" + element.parentElement.clientHeight);
            visibleHeight(element.parentElement.clientHeight);
            visibleWidth(element.parentElement.clientWidth);
            return foreachResult;
        }
    };
    function getVisibleSubArray(element, scrollTop, scrollLeft, rowHeight, columnWidth, visibleHeight, visibleWidth, array, orientation) {
        console.log("c" + element.parentElement.clientHeight);
        var itemsOverplusCount = 3;
        var itemsOverplusBegin = Math.floor(itemsOverplusCount / 2);
        var itemsOverplusEnd = itemsOverplusCount - itemsOverplusBegin;
        var arrayLength = array.length || 0;
        var unitSize;
        var scrollPosition;
        var visibleSize;
        var isHorizontalMode = orientation.toLowerCase() === 'horizontal';
        if (isHorizontalMode) {
            unitSize = columnWidth;
            scrollPosition = scrollLeft;
            visibleSize = visibleWidth;
        }
        else {
            unitSize = rowHeight;
            scrollPosition = scrollTop;
            visibleSize = visibleHeight;
        }
        var desiredSize = arrayLength * unitSize;
        if (scrollPosition() > desiredSize) {
            var endScrollPosition = desiredSize - visibleSize();
            if (endScrollPosition < 0) {
                endScrollPosition = 0;
            }
            if (isHorizontalMode) {
                console.log("Scrolled out of range, autoscrolling to: " + endScrollPosition + ", " + element.parentElement.scrollTop);
                element.parentElement.scrollLeft = endScrollPosition;
            }
            else {
                // alert(`Scrolled out of range, autoscrolling to: ${element.parentElement.scrollLeft}, ${1000}`)
                element.parentElement.scrollTop = endScrollPosition;
            }
        }
        // calculate startIndex        
        var startIndex = Math.floor(scrollPosition() / unitSize) - itemsOverplusBegin;
        var usedItemsOverplusBegin = itemsOverplusBegin;
        if (startIndex < 0) {
            usedItemsOverplusBegin = itemsOverplusBegin + startIndex;
            startIndex = 0;
        }
        var visibleElementsCount = Math.floor(visibleSize() / unitSize);
        var renderedElementsCount = visibleElementsCount + itemsOverplusEnd + usedItemsOverplusBegin;
        if (renderedElementsCount + startIndex > arrayLength) {
            renderedElementsCount = arrayLength - startIndex;
        }
        if (isHorizontalMode) {
            element.style.paddingLeft = startIndex * columnWidth + "px";
            element.style.width = desiredSize - startIndex * columnWidth + "px";
        }
        else {
            element.style.paddingTop = startIndex * rowHeight + "px";
            element.style.paddingBottom = (arrayLength - startIndex - renderedElementsCount) * rowHeight + "px";
        }
        // alert(`startIndex:${startIndex()} visibleElementsCount:${visibleElementsCount} arrayLength:${arrayLength} visibleHeight:${visibleHeight} elementClientHeight:${element.clientHeight} elementChildren:${element.childElementCount}`);
        if (Array.isArray(array)) {
            return array.slice(startIndex, startIndex + renderedElementsCount);
        }
        return array;
    }
    /*
    - Mode = Vertical | Horizontal ✅
    - Na začátku zjistit defaultní padding boxu a připočítávat ho
    - Správně reagovat na resize elementu - timer
    - Ujistit se, že zásah do kolekce GridData nebo její nahrazení jinou kolekcí se propíše do komponenty ✅
    - Ověřit, že se to chová dobře na mobilech

    Bonus
    - Změřit si zobrazené elementy a zařídit se podle toho


    */
})();
