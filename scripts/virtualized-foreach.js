var VirtualizedScrollArea = /** @class */ (function () {
    function VirtualizedScrollArea(arrayLength, unitSize, onFixScrollPosition) {
        this.arrayLength = arrayLength;
        this.unitSize = unitSize;
        this.onFixScrollPosition = onFixScrollPosition;
        this.state = ko.observable();
    }
    VirtualizedScrollArea.prototype.getState = function () {
        return this.state();
    };
    VirtualizedScrollArea.prototype.setState = function (newState) {
        this.state(newState);
    };
    VirtualizedScrollArea.prototype.getDesiredSize = function () {
        return this.arrayLength * this.unitSize;
    };
    VirtualizedScrollArea.prototype.fixScrollPosition = function (position) {
        this.onFixScrollPosition(position);
    };
    return VirtualizedScrollArea;
}());
(function () {
    function addOrReplaceEventListener(element, eventName, handler, eventTarget, id) {
        removeEventListenerFromElementById(element, eventName, eventTarget, id);
        eventTarget.addEventListener(eventName, handler);
        element[id] = handler;
    }
    function removeEventListenerFromElementById(storageElement, eventName, eventTarget, id) {
        var existingHandler = removeSavedObjectById(storageElement, id);
        if (existingHandler) {
            eventTarget.removeEventListener(eventName, existingHandler);
        }
    }
    function removeSavedObjectById(storageElement, id) {
        var existingHandler = storageElement[id];
        storageElement[id] = undefined;
        return existingHandler;
    }
    function setOrReplaceInterval(element, handler, timeout, id) {
        removeIntervalFromElementById(element, id);
        var i = setInterval(handler, timeout);
        element[id] = i;
    }
    function removeIntervalFromElementById(storageElement, id) {
        var existingInterval = removeSavedObjectById(storageElement, id);
        if (existingInterval) {
            clearInterval(existingInterval);
        }
    }
    function getScrollState(options, element) {
        if (options.orientation === "horizontal") {
            return {
                elementPosition: element.parentElement.getBoundingClientRect().left,
                scrollPosition: element.parentElement.scrollLeft,
                windowScrollPosition: window.scrollX,
                visibleSize: element.parentElement.clientWidth,
                windowSize: window.innerWidth
            };
        }
        else {
            return {
                elementPosition: element.parentElement.getBoundingClientRect().top,
                scrollPosition: element.parentElement.scrollTop,
                windowScrollPosition: window.scrollY,
                visibleSize: element.parentElement.clientHeight,
                windowSize: window.innerHeight
            };
        }
    }
    var elementScrollHandlerStorageKey = 'dotvvmVirtualForeachScrollElement';
    var windowScrollHandlerStorageKey = 'dotvvmVirtualForeachScrollWindow';
    var resizeIntervalStorageKey = 'dotvvmVirtualForeachElementResizeInterval';
    function bindHandlers(options, element, scrollArea) {
        // react to scroll
        function scrollOrResizeHandler() {
            var state = getScrollState(options, element);
            if (options.enableLogging) {
                console.log(state);
            }
            scrollArea.setState(state);
        }
        ;
        addOrReplaceEventListener(element.parentElement, "scroll", scrollOrResizeHandler, element.parentElement, elementScrollHandlerStorageKey);
        addOrReplaceEventListener(element.parentElement, "scroll", scrollOrResizeHandler, window, windowScrollHandlerStorageKey);
        setOrReplaceInterval(element, scrollOrResizeHandler, 1000, resizeIntervalStorageKey);
    }
    function unbindHandlers(element) {
        removeEventListenerFromElementById(element.parentElement, "scroll", element.parentElement, elementScrollHandlerStorageKey);
        removeEventListenerFromElementById(element.parentElement, "scroll", window, windowScrollHandlerStorageKey);
        removeIntervalFromElementById(element, resizeIntervalStorageKey);
    }
    function resetElementPaddings(element) {
        element.removeAttribute("style");
    }
    function setElementPaddings(options, element, arrayRange, scrollArea) {
        if (options.orientation === 'horizontal') {
            element.style.paddingLeft = arrayRange.startIndex * scrollArea.unitSize + "px";
            element.style.width = scrollArea.getDesiredSize() - arrayRange.startIndex * scrollArea.unitSize + "px";
        }
        else {
            element.style.paddingTop = arrayRange.startIndex * scrollArea.unitSize + "px";
            element.style.paddingBottom = (scrollArea.arrayLength - arrayRange.endIndex - 1) * scrollArea.unitSize + "px";
        }
    }
    function fixScrollPosition(options, element, position) {
        if (options.orientation === "horizontal") {
            element.parentElement.scrollLeft = position;
        }
        else {
            element.parentElement.scrollTop = position;
        }
    }
    function coerceInputArray(array) {
        try {
            if (Array.isArray(array)) {
                return array;
            }
            else if (Array.isArray(array.data())) {
                return array.data();
            }
        }
        catch (_a) { }
        return null;
    }
    ko.bindingHandlers["virtualized-foreach"] = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            return ko.bindingHandlers['foreach']['init'](element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            // get source array
            var value = valueAccessor();
            var array = coerceInputArray(ko.unwrap(value));
            if (array === null) {
                console.warn("Array was not recognized by virtualized-foreach binding, falling back to regular foreach.");
                resetElementPaddings(element);
                unbindHandlers(element);
                return ko.bindingHandlers['foreach']['update'](element, function () { return value; }, allBindingsAccessor, viewModel, bindingContext);
            }
            // get options
            var options = allBindingsAccessor.get("virtualized-foreach-options");
            if (options.enableLogging) {
                console.log("Calling v-foreach update with params: elementSize=" + options.elementSize + ", orientation=" + options.orientation);
            }
            // create scroll area
            var scrollArea = new VirtualizedScrollArea(array.length, options.elementSize, function (pos) { return fixScrollPosition(options, element, pos); });
            scrollArea.setState(getScrollState(options, element));
            // bind handlers
            bindHandlers(options, element, scrollArea);
            // create sub array and calculate paddings
            var visibleArray = ko.computed(function () {
                fixOutOfRangeScrollPosition(options, element, scrollArea);
                var arrayRange = getVisibleSubArrayRange(options, scrollArea);
                setElementPaddings(options, element, arrayRange, scrollArea);
                return array.slice(arrayRange.startIndex, arrayRange.endIndex + 1);
            });
            // create foreach binding with only subarray items
            var foreachResult = ko.bindingHandlers['foreach']['update'](element, function () { return visibleArray; }, allBindingsAccessor, viewModel, bindingContext);
            scrollArea.setState(getScrollState(options, element));
            return foreachResult;
        }
    };
    function getVisibleSubArrayRange(options, scrollArea) {
        if (options.enableLogging) {
            console.log("Recalculating array (orientation=" + options.orientation + ")");
        }
        // calculate startIndex
        var arrayRange = calculateArrayRange(options, scrollArea);
        if (options.enableLogging) {
            console.log("Returning subarray within indexes " + arrayRange.startIndex + " and " + arrayRange.endIndex + ".");
        }
        // return visible array range
        return arrayRange;
    }
    function fixOutOfRangeScrollPosition(options, element, scrollArea) {
        var state = scrollArea.getState();
        var desiredSize = scrollArea.getDesiredSize();
        var maxEndScrollPosition = desiredSize - state.visibleSize;
        if (state.scrollPosition > maxEndScrollPosition) {
            if (maxEndScrollPosition < 0) {
                maxEndScrollPosition = 0;
            }
            if (options.enableLogging) {
                console.warn("Scrolled out of range, autoscrolling to: " + maxEndScrollPosition + ", " + element.parentElement.scrollTop);
            }
            scrollArea.fixScrollPosition(maxEndScrollPosition);
        }
    }
    function calculateArrayRange(options, scrollArea) {
        var overflowElementCount = options.overflowElementCount || 3;
        var overflowElementCountBegin = Math.floor(overflowElementCount / 2);
        var overflowElementCountEnd = overflowElementCount - overflowElementCountBegin;
        var state = scrollArea.getState();
        var startPosition = state.scrollPosition;
        if (state.elementPosition < 0) {
            startPosition -= state.elementPosition;
        }
        var startIndex = Math.floor(startPosition / scrollArea.unitSize) - overflowElementCountBegin;
        if (startIndex < 0) {
            startIndex = 0;
            startPosition = 0;
        }
        var endPosition = 0;
        var displayableElementSize = state.visibleSize + state.elementPosition;
        if (displayableElementSize > state.windowSize) {
            endPosition += startPosition + state.windowSize;
            if (state.elementPosition > 0) {
                endPosition -= state.elementPosition;
            }
        }
        else {
            endPosition += startPosition + displayableElementSize;
        }
        var endIndex = Math.floor(endPosition / scrollArea.unitSize) + overflowElementCountEnd;
        if (endIndex >= scrollArea.arrayLength) {
            endIndex = scrollArea.arrayLength - 1;
        }
        return { startIndex: startIndex, endIndex: endIndex };
    }
})();
