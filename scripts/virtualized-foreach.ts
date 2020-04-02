(function () {
    ko.bindingHandlers["virtualized-foreach"] = {
        init(element: HTMLElement, valueAccessor: () => any, allBindingsAccessor: KnockoutAllBindingsAccessor, viewModel: any, bindingContext: KnockoutBindingContext) {

            return ko.bindingHandlers['foreach']['init'](element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
        },
        update(element: HTMLElement, valueAccessor: () => any, allBindingsAccessor: KnockoutAllBindingsAccessor, viewModel: any, bindingContext: KnockoutBindingContext) {
            let array = ko.unwrap(valueAccessor());
            // get parameters
            let rowHeight = allBindingsAccessor.get("virtualized-foreach-row-height") || 0;
            let columnWidth = allBindingsAccessor.get("virtualized-foreach-column-width") || 0;
            let orientation = allBindingsAccessor.get("virtualized-foreach-orientation") || 'vertical';

            // get scroll values and handle scroll changes
            let scrollTop = ko.observable(element.parentElement.scrollTop);
            let scrollLeft = ko.observable(element.parentElement.scrollLeft);

            let scrollHandler = element.parentElement['dotvvmVirtualForeachScroll'];
            if (scrollHandler) {
                element.parentElement.removeEventListener("scroll", scrollHandler);
            }

            scrollHandler = () => {
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
            let visibleHeight = ko.observable(element.parentElement.clientHeight);
            let visibleWidth = ko.observable(element.parentElement.clientWidth);

            // create sub array and calculate paddings
            let visibleArray = ko.computed(() => getVisibleSubArray(element, scrollTop, scrollLeft, rowHeight, columnWidth, visibleHeight, visibleWidth, array, orientation));

            // alert("update");

            // create foreach binding with only subarray items
            let foreachResult = ko.bindingHandlers['foreach']['update'](element, () => visibleArray, allBindingsAccessor, viewModel, bindingContext);

            // update size of element visible on display (before foreach binding creatating it was 0)
            console.log("a" + element.parentElement.clientHeight);
            visibleHeight(element.parentElement.clientHeight);
            visibleWidth(element.parentElement.clientWidth);

            return foreachResult;
        }
    }

    function getVisibleSubArray(element: HTMLElement, scrollTop: KnockoutObservable<number>, scrollLeft: KnockoutObservable<number>,
        rowHeight: number, columnWidth: number, visibleHeight: KnockoutObservable<number>, visibleWidth: KnockoutObservable<number>,
        array: any, orientation: string) {
        
        console.log("c" + element.parentElement.clientHeight);
        const itemsOverplusCount = 3;
        const itemsOverplusBegin = Math.floor(itemsOverplusCount / 2);
        const itemsOverplusEnd = itemsOverplusCount - itemsOverplusBegin;
        let arrayLength = array.length || 0;
        let unitSize: number;
        let scrollPosition: KnockoutObservable<number>;
        let visibleSize: KnockoutObservable<number>;
        let isHorizontalMode = orientation.toLowerCase() === 'horizontal';

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

        let desiredSize = arrayLength * unitSize;

        if (scrollPosition() > desiredSize) {
            let endScrollPosition = desiredSize - visibleSize();
            if (endScrollPosition < 0) {
                endScrollPosition = 0;
            }
            if (isHorizontalMode) {
                console.log(`Scrolled out of range, autoscrolling to: ${endScrollPosition}, ${element.parentElement.scrollTop}`);
                element.parentElement.scrollLeft = endScrollPosition;
            }
            else {
                // alert(`Scrolled out of range, autoscrolling to: ${element.parentElement.scrollLeft}, ${1000}`)
                element.parentElement.scrollTop = endScrollPosition;
            }
        }

        // calculate startIndex        
        let startIndex = Math.floor(scrollPosition() / unitSize) - itemsOverplusBegin;
        let usedItemsOverplusBegin = itemsOverplusBegin;
        if (startIndex < 0) {
            usedItemsOverplusBegin = itemsOverplusBegin + startIndex;
            startIndex = 0;
        }
        let visibleElementsCount = Math.floor(visibleSize() / unitSize);
        let renderedElementsCount = visibleElementsCount + itemsOverplusEnd + usedItemsOverplusBegin;
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