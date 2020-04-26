interface VirtualizedForeachOptions {
    elementSize: number;
    orientation: 'vertical' | 'horizontal';
    enableLogging?: boolean;
    overflowElementCount?: number;
}

interface ArrayRange {
    startIndex: number;
    endIndex: number;
}

interface ScrollState {
    elementPosition: number;
    scrollPosition: number;
    windowScrollPosition: number;
    visibleSize: number;
    windowSize: number;    
}

class VirtualizedScrollArea {
    
    private state: KnockoutObservable<ScrollState>;
    
    constructor(public arrayLength: number, public unitSize: number, private onFixScrollPosition: (number) => void) {
        this.state = ko.observable();
    }

    getState(): ScrollState {
        return this.state();
    }

    setState(newState: ScrollState) {
        this.state(newState);
    }    

    getDesiredSize() {
        return this.arrayLength * this.unitSize;
    }

    fixScrollPosition(position: number) {
        this.onFixScrollPosition(position);
    }

}


(function () {
    function addOrReplaceEventListener<K extends keyof HTMLElementEventMap>(element: HTMLElement, eventName: K, handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any, eventTarget: any, id: string) {
        let existingHandler = removeObjectById(element, id);
        if (existingHandler) {
            eventTarget.removeEventListener(eventName, existingHandler);
        }
        eventTarget.addEventListener(eventName, handler);
        element[id] = handler;
    }
    
    function removeObjectById(storageElement: any, id: string) {
        let existingHandler = storageElement[id];
        storageElement[id] = undefined;
        return existingHandler;
    }

    function setOrReplaceInterval(element: HTMLElement, handler: () => any, timeout: number, id: string) {
        let existingInterval = removeObjectById(element, id);
        if(existingInterval) {
            clearInterval(existingInterval)
        }
        let i = setInterval(handler, timeout);
        element[id] = i;
    }

    function getScrollState(options: VirtualizedForeachOptions, element: HTMLElement): ScrollState {
        if (options.orientation === "horizontal") {
            return {
                elementPosition: element.parentElement.getBoundingClientRect().left,
                scrollPosition: element.parentElement.scrollLeft,
                windowScrollPosition: window.scrollX,
                visibleSize: element.parentElement.clientWidth,
                windowSize: window.innerWidth
            };
        } else {
            return {
                elementPosition: element.parentElement.getBoundingClientRect().top,
                scrollPosition: element.parentElement.scrollTop,
                windowScrollPosition: window.scrollY,
                visibleSize: element.parentElement.clientHeight,
                windowSize: window.innerHeight
            };
        }
    }

    function bindHandlers(options: VirtualizedForeachOptions, element: HTMLElement, scrollArea: VirtualizedScrollArea) {
        // react to scroll
        function scrollOrResizeHandler() {
            const state = getScrollState(options, element);
            if (options.enableLogging) {
                console.log(state);
            }
            scrollArea.setState(state);
        };
        addOrReplaceEventListener(element.parentElement, "scroll", scrollOrResizeHandler, element.parentElement, 'dotvvmVirtualForeachScrollElement');
        addOrReplaceEventListener(element.parentElement, "scroll", scrollOrResizeHandler, window, 'dotvvmVirtualForeachScrollWindow');
        setOrReplaceInterval(element, scrollOrResizeHandler, 1000, "dotvvmVirtualForeachElementResizeInterval");
    }

    function setElementPaddings(options: VirtualizedForeachOptions, element: HTMLElement, arrayRange: ArrayRange, scrollArea: VirtualizedScrollArea) {
        if (options.orientation === 'horizontal') {
            element.style.paddingLeft = arrayRange.startIndex * scrollArea.unitSize + "px";
            element.style.width = scrollArea.getDesiredSize() - arrayRange.startIndex * scrollArea.unitSize + "px";
        }
        else {
            element.style.paddingTop = arrayRange.startIndex * scrollArea.unitSize + "px";
            element.style.paddingBottom = (scrollArea.arrayLength - arrayRange.endIndex - 1) * scrollArea.unitSize + "px";
        }
    }

    function fixScrollPosition(options: VirtualizedForeachOptions, element: HTMLElement, position: number) {
        if (options.orientation === "horizontal") {
            element.parentElement.scrollLeft = position;
        } else {
            element.parentElement.scrollTop = position;
        }
    }

    function coerceInputArray(array: any) {
        if (Array.isArray(array)) {
            return array;
        }
        else if (Array.isArray(array.data())) {
            return array.data();
        } else {
            return null;
        }
    }

    ko.bindingHandlers["virtualized-foreach"] = {
        init(element: HTMLElement, valueAccessor: () => any, allBindingsAccessor: KnockoutAllBindingsAccessor, viewModel: any, bindingContext: KnockoutBindingContext) {
            return ko.bindingHandlers['foreach']['init'](element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
        },
        update(element: HTMLElement, valueAccessor: () => any, allBindingsAccessor: KnockoutAllBindingsAccessor, viewModel: any, bindingContext: KnockoutBindingContext) {
            
            // get source array
            const value = valueAccessor();
            const array = coerceInputArray(ko.unwrap(value));
            if (array === null) {
                console.warn("Array was not recognized by virtualized-foreach binding, falling back to regular foreach.");
                return ko.bindingHandlers['foreach']['update'](element, () => value, allBindingsAccessor, viewModel, bindingContext);
            }   

            // get options
            let options: VirtualizedForeachOptions = allBindingsAccessor.get("virtualized-foreach-options");
            if (options.enableLogging) {
                console.log(`Calling v-foreach update with params: elementSize=${options.elementSize}, orientation=${options.orientation}`);
            }

            // create scroll area
            var scrollArea = new VirtualizedScrollArea(array.length, options.elementSize, pos => fixScrollPosition(options, element, pos));
            scrollArea.setState(getScrollState(options, element));

            // bind handlers
            bindHandlers(options, element, scrollArea);

            // create sub array and calculate paddings
            let visibleArray = ko.computed(() => 
            {
                var arrayRange = getVisibleSubArray(options, element, scrollArea);
                setElementPaddings(options, element, arrayRange, scrollArea);
                return array.slice(arrayRange.startIndex, arrayRange.endIndex + 1);
            });

            // create foreach binding with only subarray items
            let foreachResult = ko.bindingHandlers['foreach']['update'](element, () => visibleArray, allBindingsAccessor, viewModel, bindingContext);
            scrollArea.setState(getScrollState(options, element));
            return foreachResult;
        }
    }

    function getVisibleSubArray(options: VirtualizedForeachOptions, element: HTMLElement, scrollArea: VirtualizedScrollArea) {

        if (options.enableLogging) {
            console.log(`Recalculating array (orientation=${options.orientation})`);
        }

        // fix out-of-range scroll position
        fixOutOfRangeScrollPosition(options, element, scrollArea);

        // calculate startIndex
        let arrayRange = calculateArrayRange(options, scrollArea);

        if (options.enableLogging) {
            console.log(`Returning subarray within indexes ${arrayRange.startIndex} and ${arrayRange.endIndex}.`);
        }

        // return visible array range
        return arrayRange;
    }

    function fixOutOfRangeScrollPosition(options: VirtualizedForeachOptions, element: HTMLElement, scrollArea: VirtualizedScrollArea) {
        const state = scrollArea.getState();
        const desiredSize = scrollArea.getDesiredSize();

        if (state.scrollPosition > desiredSize) {
            let endScrollPosition = desiredSize - state.visibleSize;
            if (endScrollPosition < 0) {
                endScrollPosition = 0;
            }

            if (options.enableLogging) {
                console.warn(`Scrolled out of range, autoscrolling to: ${endScrollPosition}, ${element.parentElement.scrollTop}`);
            }

            scrollArea.fixScrollPosition(endScrollPosition);            
        }
    }

    function calculateArrayRange(options: VirtualizedForeachOptions, scrollArea: VirtualizedScrollArea) {
        
        const overflowElementCount = options.overflowElementCount || 3;
        const overflowElementCountBegin = Math.floor(overflowElementCount / 2);
        const overflowElementCountEnd = overflowElementCount - overflowElementCountBegin;
        
        const state = scrollArea.getState();

        let startPosition = state.scrollPosition;
        if (state.elementPosition < 0) {
            startPosition -= state.elementPosition;
        }

        let startIndex = Math.floor(startPosition / scrollArea.unitSize) - overflowElementCountBegin;
        if (startIndex < 0) {
            startIndex = 0;
            startPosition = 0;
        }

        let endPosition = 0;
        let displayableElementSize = state.visibleSize + state.elementPosition;
        if (displayableElementSize > state.windowSize) {
            endPosition += startPosition + state.windowSize;
            if (state.elementPosition > 0) {
                endPosition -= state.elementPosition;
            }
        }
        else {
            endPosition += startPosition + displayableElementSize;
        }

        let endIndex = Math.floor(endPosition / scrollArea.unitSize) + overflowElementCountEnd;
        if (endIndex >= scrollArea.arrayLength) {
            endIndex = scrollArea.arrayLength - 1;
        }

        return { startIndex, endIndex };
    }


    /*
    - Mode = Vertical | Horizontal ✅
    - Na začátku zjistit defaultní padding boxu a připočítávat ho
    - Správně reagovat na resize elementu - timer ✅
    - Ujistit se, že zásah do kolekce GridData nebo její nahrazení jinou kolekcí se propíše do komponenty ✅
    - Ověřit, že se to chová dobře na mobilech ✅

    Bonus
    - Změřit si zobrazené elementy a zařídit se podle toho


    - Přidat podporu pro virzualizaci při scrollování celé stránky ✅


    */

})();

