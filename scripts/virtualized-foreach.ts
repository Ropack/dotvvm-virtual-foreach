interface ScrollInfo {
    elementScrollTop: KnockoutObservable<number>;
    elementScrollLeft: KnockoutObservable<number>;
    windowScrollTop: KnockoutObservable<number>;
    windowScrollLeft: KnockoutObservable<number>;
}
(function () {
    ko.bindingHandlers["virtualized-foreach"] = {
        init(element: HTMLElement, valueAccessor: () => any, allBindingsAccessor: KnockoutAllBindingsAccessor, viewModel: any, bindingContext: KnockoutBindingContext) {

            return ko.bindingHandlers['foreach']['init'](element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
        },
        update(element: HTMLElement, valueAccessor: () => any, allBindingsAccessor: KnockoutAllBindingsAccessor, viewModel: any, bindingContext: KnockoutBindingContext) {
            function addOrReplaceEventListener<K extends keyof HTMLElementEventMap>(element: HTMLElement, eventName: K, handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any, eventTarget: any, id: string) {
                let existingHandler = element[id];
                if (existingHandler) {
                    eventTarget.removeEventListener(eventName, existingHandler);
                }
                eventTarget.addEventListener(eventName, handler);
                element[id] = handler;
            }

            let array = ko.unwrap(valueAccessor());
            // get parameters
            let rowHeight = allBindingsAccessor.get("virtualized-foreach-row-height") || 0;
            let columnWidth = allBindingsAccessor.get("virtualized-foreach-column-width") || 0;
            let orientation = allBindingsAccessor.get("virtualized-foreach-orientation") || 'vertical';
            let isHorizontalMode = orientation.toLowerCase() === 'horizontal';

            console.log(`Calling v-foreach update with params: rowHeight=${rowHeight}, columnWidth=${columnWidth}, orientation=${orientation}`);

            let elementPosition = ko.observable(element.parentElement.getBoundingClientRect());

            // get scroll values and handle scroll changes
            let scrollInfo = {
                elementScrollTop: ko.observable(element.parentElement.scrollTop),
                elementScrollLeft: ko.observable(element.parentElement.scrollLeft),
                windowScrollTop: ko.observable(window.scrollY),
                windowScrollLeft: ko.observable(window.scrollX)
            }

            let windowScrollHandler = function () {
                console.log(`Window has been scrolled. Updating scroll values: top=${this.scrollY}, left=${this.scrollX}`);
                scrollInfo.windowScrollTop(this.scrollY);
                scrollInfo.windowScrollLeft(this.scrollX);
            };
            let elementScrollHandler = function () {
                console.log(`Element has been scrolled. Updating scroll values: top=${this.scrollTop}, left=${this.scrollLeft}`);
                scrollInfo.elementScrollTop(this.scrollTop);
                scrollInfo.elementScrollLeft(this.scrollLeft);
            };
            addOrReplaceEventListener(element.parentElement, "scroll", elementScrollHandler, element.parentElement, 'dotvvmVirtualForeachScrollElement');
            addOrReplaceEventListener(element.parentElement, "scroll", windowScrollHandler, window, 'dotvvmVirtualForeachScrollWindow');

            // get size of element visible on display
            console.log("u" + element.parentElement.clientHeight);
            let visibleElementHeight = ko.observable(element.parentElement.clientHeight);
            let visibleElementWidth = ko.observable(element.parentElement.clientWidth);
            let visibleHeight = ko.computed(() => {
                if (visibleElementHeight() < window.innerHeight) {
                    console.log("Returned window height:"+window.innerHeight);
                    return window.innerHeight;
                }
                else {
                    return visibleElementHeight();
                }
            });
            let visibleWidth = ko.computed(() => {
                if (visibleElementWidth() < window.innerWidth) {
                    return window.innerWidth;
                }
                else {
                    return visibleElementWidth();
                }
            });

            // create sub array and calculate paddings
            let visibleArray = ko.computed(() => getVisibleSubArray(element, scrollInfo, rowHeight, columnWidth, elementPosition, visibleHeight, visibleWidth, array, isHorizontalMode));

            // alert("update");

            // create foreach binding with only subarray items
            let foreachResult = ko.bindingHandlers['foreach']['update'](element, () => visibleArray, allBindingsAccessor, viewModel, bindingContext);

            // update size of element visible on display (before foreach binding creatating it was 0)
            console.log("a" + element.parentElement.clientHeight);
            visibleElementHeight(element.parentElement.clientHeight);
            visibleElementWidth(element.parentElement.clientWidth);

            return foreachResult;
        }
    }

    function getVisibleSubArray(element: HTMLElement, scrollInfo: ScrollInfo, rowHeight: number, columnWidth: number,
        elementPositionRect: KnockoutObservable<DOMRect>, visibleHeight: KnockoutObservable<number>, visibleWidth: KnockoutObservable<number>,
        array: any, isHorizontalMode: boolean) {

        console.log(`Recalculating array (horizontal=${isHorizontalMode})`);
        const itemsOverplusCount = 3;
        const itemsOverplusBegin = Math.floor(itemsOverplusCount / 2);
        const itemsOverplusEnd = itemsOverplusCount - itemsOverplusBegin;
        let arrayLength = array.length || 0;
        let unitSize: number;
        let scrollPosition: KnockoutObservable<number>;
        let windowScrollPosition: KnockoutObservable<number>;
        let windowSize: number;
        let visibleSize: KnockoutObservable<number>;
        let elementPosition : number;

        if (isHorizontalMode) {
            unitSize = columnWidth;
            scrollPosition = scrollInfo.elementScrollLeft;
            windowScrollPosition = scrollInfo.windowScrollLeft;
            visibleSize = visibleWidth;
            elementPosition = elementPositionRect().left;
            windowSize = window.innerWidth;
        }
        else {
            unitSize = rowHeight;
            scrollPosition = scrollInfo.elementScrollTop;
            windowScrollPosition = scrollInfo.windowScrollTop;
            visibleSize = visibleHeight;
            elementPosition = elementPositionRect().top;
            windowSize = window.innerHeight;
        }

        let desiredSize = arrayLength * unitSize;

        if (scrollPosition() > desiredSize) {
            let endScrollPosition = desiredSize - visibleSize();
            if (endScrollPosition < 0) {
                endScrollPosition = 0;
            }
            if (isHorizontalMode) {
                console.warn(`Scrolled out of range, autoscrolling to: ${endScrollPosition}, ${element.parentElement.scrollTop}`);
                element.parentElement.scrollLeft = endScrollPosition;
            }
            else {
                // alert(`Scrolled out of range, autoscrolling to: ${element.parentElement.scrollLeft}, ${1000}`)
                element.parentElement.scrollTop = endScrollPosition;
            }
        }

        // calculate startIndex     
        let startPosition = scrollPosition() + windowScrollPosition() - elementPosition;
        let startIndex = Math.floor(startPosition / unitSize) - itemsOverplusBegin;
        // let usedItemsOverplusBegin = itemsOverplusBegin;
        if (startIndex < 0) {
            // usedItemsOverplusBegin = itemsOverplusBegin + startIndex;
            startIndex = 0;
        }

        let endPosition : number;
        let displayableElementSize = visibleSize() + elementPosition - windowScrollPosition();
        if(displayableElementSize > windowSize) {
            endPosition = startPosition + windowSize;
        }
        else {
            endPosition = startPosition + displayableElementSize;
        }
        let endIndex = Math.floor(endPosition / unitSize) + itemsOverplusEnd;

        // let visibleElementsCount = Math.floor(visibleSize() / unitSize);
        // let renderedElementsCount = visibleElementsCount + itemsOverplusEnd + usedItemsOverplusBegin;
        // if (renderedElementsCount + startIndex > arrayLength) {
        //     renderedElementsCount = arrayLength - startIndex;
        // }
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
            console.log(`Returning subarray within indexes ${startIndex} and ${endIndex}.`)
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


    - Přidat podporu pro virzualizaci při scrollování celé stránky


    */

})();