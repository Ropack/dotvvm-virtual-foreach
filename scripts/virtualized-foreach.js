(function () {
    ko.bindingHandlers["virtualized-foreach"] = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            return ko.bindingHandlers['foreach']['init'](element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            function addOrReplaceEventListener(element, eventName, handler, eventTarget, id) {
                var existingHandler = element[id];
                if (existingHandler) {
                    eventTarget.removeEventListener(eventName, existingHandler);
                }
                eventTarget.addEventListener(eventName, handler);
                element[id] = handler;
            }
            var array = ko.unwrap(valueAccessor());
            // get parameters
            var rowHeight = allBindingsAccessor.get("virtualized-foreach-row-height") || 0;
            var columnWidth = allBindingsAccessor.get("virtualized-foreach-column-width") || 0;
            var orientation = allBindingsAccessor.get("virtualized-foreach-orientation") || 'vertical';
            var isHorizontalMode = orientation.toLowerCase() === 'horizontal';
            console.log("Calling v-foreach update with params: rowHeight=" + rowHeight + ", columnWidth=" + columnWidth + ", orientation=" + orientation);
            var elementPosition = ko.observable(element.parentElement.getBoundingClientRect());
            // get scroll values and handle scroll changes
            var scrollInfo = {
                elementScrollTop: ko.observable(element.parentElement.scrollTop),
                elementScrollLeft: ko.observable(element.parentElement.scrollLeft),
                windowScrollTop: ko.observable(window.scrollY),
                windowScrollLeft: ko.observable(window.scrollX)
            };
            var windowScrollHandler = function () {
                console.log("Window has been scrolled. Updating scroll values: top=" + this.scrollY + ", left=" + this.scrollX);
                scrollInfo.windowScrollTop(this.scrollY);
                scrollInfo.windowScrollLeft(this.scrollX);
                elementPosition(element.parentElement.getBoundingClientRect());
            };
            var elementScrollHandler = function () {
                console.log("Element has been scrolled. Updating scroll values: top=" + this.scrollTop + ", left=" + this.scrollLeft);
                scrollInfo.elementScrollTop(this.scrollTop);
                scrollInfo.elementScrollLeft(this.scrollLeft);
            };
            addOrReplaceEventListener(element.parentElement, "scroll", elementScrollHandler, element.parentElement, 'dotvvmVirtualForeachScrollElement');
            addOrReplaceEventListener(element.parentElement, "scroll", windowScrollHandler, window, 'dotvvmVirtualForeachScrollWindow');
            // get size of element visible on display
            console.log("u" + element.parentElement.clientHeight);
            var visibleElementHeight = ko.observable(element.parentElement.clientHeight);
            var visibleElementWidth = ko.observable(element.parentElement.clientWidth);
            // create sub array and calculate paddings
            var visibleArray = ko.computed(function () { return getVisibleSubArray(element, scrollInfo, rowHeight, columnWidth, elementPosition, visibleElementHeight, visibleElementWidth, array, isHorizontalMode); });
            // alert("update");
            // create foreach binding with only subarray items
            var foreachResult = ko.bindingHandlers['foreach']['update'](element, function () { return visibleArray; }, allBindingsAccessor, viewModel, bindingContext);
            // update size of element visible on display (before foreach binding creatating it was 0)
            console.log("a" + element.parentElement.clientHeight);
            visibleElementHeight(element.parentElement.clientHeight);
            visibleElementWidth(element.parentElement.clientWidth);
            return foreachResult;
        }
    };
    function getVisibleSubArray(element, scrollInfo, rowHeight, columnWidth, elementPositionRect, visibleHeight, visibleWidth, array, isHorizontalMode) {
        console.log("Recalculating array (horizontal=" + isHorizontalMode + ")");
        var itemsOverplusCount = 3;
        var itemsOverplusBegin = Math.floor(itemsOverplusCount / 2);
        var itemsOverplusEnd = itemsOverplusCount - itemsOverplusBegin;
        var arrayLength = array.length || 0;
        var unitSize;
        var scrollPosition;
        // let windowScrollPosition: KnockoutObservable<number>;
        var windowSize;
        var visibleSize;
        var elementPosition;
        if (isHorizontalMode) {
            unitSize = columnWidth;
            scrollPosition = scrollInfo.elementScrollLeft;
            // windowScrollPosition = scrollInfo.windowScrollLeft;
            visibleSize = visibleWidth;
            elementPosition = elementPositionRect().left;
            windowSize = window.innerWidth;
        }
        else {
            unitSize = rowHeight;
            scrollPosition = scrollInfo.elementScrollTop;
            // windowScrollPosition = scrollInfo.windowScrollTop;
            visibleSize = visibleHeight;
            elementPosition = elementPositionRect().top;
            windowSize = window.innerHeight;
        }
        var desiredSize = arrayLength * unitSize;
        if (scrollPosition() > desiredSize) {
            var endScrollPosition = desiredSize - visibleSize();
            if (endScrollPosition < 0) {
                endScrollPosition = 0;
            }
            if (isHorizontalMode) {
                console.warn("Scrolled out of range, autoscrolling to: " + endScrollPosition + ", " + element.parentElement.scrollTop);
                element.parentElement.scrollLeft = endScrollPosition;
            }
            else {
                // alert(`Scrolled out of range, autoscrolling to: ${element.parentElement.scrollLeft}, ${1000}`)
                element.parentElement.scrollTop = endScrollPosition;
            }
        }
        // calculate startIndex
        var startPosition = scrollPosition();
        var endPosition = 0;
        if (elementPosition < 0) {
            startPosition -= elementPosition;
        }
        var startIndex = Math.floor(startPosition / unitSize) - itemsOverplusBegin;
        if (startIndex < 0) {
            startIndex = 0;
            startPosition = 0;
        }
        var displayableElementSize = visibleSize() + elementPosition;
        if (displayableElementSize > windowSize) {
            endPosition += startPosition + windowSize;
            if (elementPosition > 0) {
                endPosition -= elementPosition;
            }
        }
        else {
            endPosition += startPosition + displayableElementSize;
        }
        var endIndex = Math.floor(endPosition / unitSize) + itemsOverplusEnd;
        if (endIndex >= arrayLength) {
            endIndex = arrayLength - 1;
        }
        if (isHorizontalMode) {
            element.style.paddingLeft = startIndex * columnWidth + "px";
            element.style.width = desiredSize - startIndex * columnWidth + "px";
        }
        else {
            element.style.paddingTop = startIndex * rowHeight + "px";
            element.style.paddingBottom = (arrayLength - endIndex - 1) * rowHeight + "px";
        }
        // alert(`startIndex:${startIndex()} visibleElementsCount:${visibleElementsCount} arrayLength:${arrayLength} visibleHeight:${visibleHeight} elementClientHeight:${element.clientHeight} elementChildren:${element.childElementCount}`);
        if (Array.isArray(array)) {
            // let endIndex = startIndex + renderedElementsCount;
            console.log("Returning subarray within indexes " + startIndex + " and " + endIndex + ".");
            return array.slice(startIndex, endIndex + 1);
        }
        return array;
    }
    /*
    - Mode = Vertical | Horizontal ✅
    - Na začátku zjistit defaultní padding boxu a připočítávat ho
    - Správně reagovat na resize elementu - timer
    - Ujistit se, že zásah do kolekce GridData nebo její nahrazení jinou kolekcí se propíše do komponenty ✅
    - Ověřit, že se to chová dobře na mobilech ✅

    Bonus
    - Změřit si zobrazené elementy a zařídit se podle toho


    - Přidat podporu pro virzualizaci při scrollování celé stránky ✅


    */
})();
